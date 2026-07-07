import API_URL from "./api";
import { db } from "./db";

const PBKDF2_ITERATIONS = 100_000;

// Silently refresh the access token once less than this much of its
// lifetime remains, so a still-open tab renews before actually expiring.
const REFRESH_THRESHOLD_MS = 15 * 60 * 1000;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return toHex(bits);
}

// Remembers this staff ID's password (as a salted hash, never in the
// clear) alongside their last-issued tokens, so `loginOffline` can sign
// them back in on this device with no network.
async function cacheCredentials(
  staffId: string,
  password: string,
  user: any,
  token: string,
  refreshToken?: string
) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);

  await db.credentials.put({
    staffId,
    passwordHash,
    salt,
    user,
    token,
    refreshToken,
    cachedAt: new Date().toISOString(),
  });
}

async function loginOffline(staffId: string, password: string) {
  const cached = await db.credentials.get(staffId);

  if (!cached) {
    throw new Error(
      "No connection, and no saved sign-in for this Staff ID on this device. Connect to the internet once to enable offline sign-in."
    );
  }

  const attemptHash = await hashPassword(password, cached.salt);

  if (attemptHash !== cached.passwordHash) {
    throw new Error("Invalid Staff ID or password.");
  }

  localStorage.setItem("token", cached.token);
  localStorage.setItem("user", JSON.stringify(cached.user));
  if (cached.refreshToken) {
    localStorage.setItem("refreshToken", cached.refreshToken);
  }

  return { token: cached.token, user: cached.user, offline: true };
}

export async function login(
  staffId: string,
  password: string
) {
  if (!navigator.onLine) {
    return loginOffline(staffId, password);
  }

  let response: Response;
  try {
    response =
      await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            staffId,
            password,
          }),
        }
      );
  } catch (err: any) {
    if (err.name === "TypeError" || err.message === "Failed to fetch") {
      return loginOffline(staffId, password);
    }
    throw err;
  }

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));

  // Best-effort: never let credential caching break a successful login.
  try {
    await cacheCredentials(staffId, password, data.user, data.token, data.refreshToken);
  } catch (err) {
    console.error(err);
  }

  return data;
}

export async function logout() {
  const token = getToken();

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  if (token && navigator.onLine) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Best-effort — the local session is already cleared either way.
    }
  }
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function getUser() {
  const stored = localStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export function needsPasswordChange() {
  return !!getUser()?.mustChangePassword;
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Reads the `exp` claim (seconds since epoch) out of a JWT without
// verifying it — this is a client-side "is it worth refreshing yet"
// hint, not a trust boundary. The server re-verifies on every request.
function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json);
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to refresh session.");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("refreshToken", data.refreshToken);

  // Keep the offline-login cache in sync so a later `loginOffline` call
  // hands back a token that's actually still valid.
  const user = getUser();
  if (user?.staffId) {
    try {
      const cached = await db.credentials.get(user.staffId);
      if (cached) {
        await db.credentials.put({ ...cached, token: data.token, refreshToken: data.refreshToken });
      }
    } catch (err) {
      console.error(err);
    }
  }

  return data.token;
}

// Proactively renews the access token shortly before it expires, and
// whenever the app comes back online — so a tab left open across a long
// offline stretch renews itself instead of surfacing a 401 mid-sync.
let sessionRefreshStarted = false;

async function maybeRefreshSession() {
  if (!navigator.onLine || !isAuthenticated() || !getRefreshToken()) return;

  const token = getToken();
  const expiry = token ? getTokenExpiryMs(token) : null;
  if (expiry !== null && expiry - Date.now() > REFRESH_THRESHOLD_MS) return;

  try {
    await refreshAccessToken();
  } catch (err: any) {
    if (err.name === "TypeError" || err.message === "Failed to fetch") {
      // Network blip — leave the session alone, try again next tick.
      return;
    }
    // The server explicitly rejected the refresh token (expired/revoked) —
    // the session is genuinely over. Clear it so route guards redirect to
    // a real login instead of retrying a dead token forever.
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }
}

export function initSessionRefresh() {
  if (sessionRefreshStarted) return;
  sessionRefreshStarted = true;

  maybeRefreshSession();
  window.addEventListener("online", maybeRefreshSession);
  setInterval(maybeRefreshSession, 5 * 60 * 1000);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  // Clear the forced-change flag locally too, so the route guard stops
  // redirecting to the forced change-password screen immediately.
  const user = getUser();
  if (user) {
    localStorage.setItem("user", JSON.stringify({ ...user, mustChangePassword: false }));
  }

  // Keep the offline-login credential cache (see `loginOffline` above) in
  // sync — otherwise the old password would keep working offline, and the
  // new one wouldn't, until the next successful online login.
  const token = getToken();
  if (user?.staffId && token) {
    try {
      await cacheCredentials(user.staffId, newPassword, { ...user, mustChangePassword: false }, token, getRefreshToken() || undefined);
    } catch (err) {
      console.error(err);
    }
  }

  return data;
}
