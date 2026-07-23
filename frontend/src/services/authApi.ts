import API_URL from "./api";
import { db } from "./db";
import { isSyncInProgress } from "./syncState";

const PBKDF2_ITERATIONS = 100_000;

// Silently refresh the access token once less than this much of its
// lifetime remains, so a still-open tab renews before actually expiring.
const REFRESH_THRESHOLD_MS = 15 * 60 * 1000;

// Matches the backend's REFRESH_TOKEN_TTL (authController.js) — past this
// point the cached refresh token is guaranteed dead server-side anyway, so
// there's no offline capability lost by cutting it off here too. Without
// this, a device that once cached a staff member's credentials could sign
// them in offline forever, with no way for a deactivation to ever reach it.
const OFFLINE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Mirrors the server's login lockout (authController.js) — offline sign-in
// otherwise has no rate limit at all, so a lost/stolen device would allow
// unlimited password guesses against the cached hash.
const OFFLINE_MAX_FAILED_ATTEMPTS = 5;
const OFFLINE_LOCKOUT_MS = 15 * 60 * 1000;

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
    failedAttempts: 0,
    lockedUntil: undefined,
  });
}

async function loginOffline(staffId: string, password: string) {
  const cached = await db.credentials.get(staffId);

  if (!cached) {
    throw new Error(
      "No connection, and no saved sign-in for this Staff ID on this device. Connect to the internet once to enable offline sign-in."
    );
  }

  if (Date.now() - new Date(cached.cachedAt).getTime() > OFFLINE_CACHE_TTL_MS) {
    throw new Error(
      "Offline sign-in for this Staff ID has expired on this device. Connect to the internet once to renew it."
    );
  }

  if (cached.lockedUntil && new Date(cached.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(cached.lockedUntil).getTime() - Date.now()) / 60000);
    throw new Error(
      `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`
    );
  }

  const attemptHash = await hashPassword(password, cached.salt);

  if (attemptHash !== cached.passwordHash) {
    const attempts = (cached.failedAttempts || 0) + 1;
    const lockedOut = attempts >= OFFLINE_MAX_FAILED_ATTEMPTS;

    await db.credentials.put({
      ...cached,
      failedAttempts: lockedOut ? 0 : attempts,
      lockedUntil: lockedOut ? new Date(Date.now() + OFFLINE_LOCKOUT_MS).toISOString() : undefined,
    });

    if (lockedOut) {
      throw new Error(
        `Too many failed attempts. Offline sign-in for this Staff ID is locked for ${OFFLINE_LOCKOUT_MS / 60000} minutes.`
      );
    }

    throw new Error("Invalid Staff ID or password.");
  }

  if (cached.failedAttempts || cached.lockedUntil) {
    await db.credentials.put({ ...cached, failedAttempts: 0, lockedUntil: undefined });
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

  // Admin/doctor accounts (see OTP_REQUIRED_ROLES on the backend) get a
  // pre-auth token instead of real session tokens at this point — the
  // server has already emailed them a 6-digit code. The caller (the login
  // page) needs to show an "enter your code" screen and complete the flow
  // via verifyOtp below before there's a session to store or cache offline.
  if (data.otpRequired) {
    return data;
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

// Completes sign-in for an account that just went through the OTP branch of
// login() above. staffId/password are passed back through (not sent to the
// server again — the password was already verified there) purely so the
// offline-login cache can be populated exactly as a normal login would.
export async function verifyOtp(
  preAuthToken: string,
  code: string,
  staffId: string,
  password: string
) {
  const response = await fetch(`${API_URL}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preAuthToken, code }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));

  try {
    await cacheCredentials(staffId, password, data.user, data.token, data.refreshToken);
  } catch (err) {
    console.error(err);
  }

  return data;
}

export async function resendOtp(preAuthToken: string) {
  const response = await fetch(`${API_URL}/auth/otp/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preAuthToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
}

export async function logout() {
  const token = getToken();

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("selectedPatient");

  // Purge the read-through PHI cache (already-synced patients, cached
  // referral detail) so it doesn't sit in IndexedDB indefinitely on a
  // shared device after sign-out. Never touch anything still queued to
  // sync (unsynced patients, "Pending Sync" referrals) — that's real
  // not-yet-uploaded work, not a cache, and must survive a logout so the
  // next sign-in (same nurse or a handover to the next shift) can still
  // send it.
  try {
    const staleSyncedPatientIds = (await db.patients.toArray())
      .filter((p) => p.synced)
      .map((p) => p.id);
    if (staleSyncedPatientIds.length) await db.patients.bulkDelete(staleSyncedPatientIds);

    const staleSyncedReferralIds = (await db.referrals.toArray())
      .filter((r) => r.synced)
      .map((r) => r.id);
    if (staleSyncedReferralIds.length) await db.referrals.bulkDelete(staleSyncedReferralIds);

    await db.cachedReferrals.clear();
  } catch (err) {
    console.error(err);
  }

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
        await db.credentials.put({
          ...cached,
          token: data.token,
          refreshToken: data.refreshToken,
          cachedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  return data.token;
}

// A live session dying (refresh rejected, or any request 401ing) only tells
// us the *server* has revoked it — e.g. deactivation. Without this, the
// device's offline-login cache for that staff ID would keep working
// regardless, since `loginOffline` never talks to the server at all. Wiping
// it here the moment the device is online to learn the account is dead
// closes that gap the instant it can be detected, rather than waiting for
// the OFFLINE_CACHE_TTL_MS backstop.
async function purgeOfflineCredentials(staffId: string | undefined) {
  if (!staffId) return;
  try {
    await db.credentials.delete(staffId);
  } catch (err) {
    console.error(err);
  }
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
    const staffId = getUser()?.staffId;
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    await purgeOfflineCredentials(staffId);
  }
}

export function initSessionRefresh() {
  if (sessionRefreshStarted) return;
  sessionRefreshStarted = true;

  maybeRefreshSession();
  window.addEventListener("online", maybeRefreshSession);
  setInterval(maybeRefreshSession, 5 * 60 * 1000);
}

function loginPathFor(pathname: string) {
  if (pathname.startsWith("/hospital")) return "/hospital/login";
  if (pathname.startsWith("/admin")) return "/login?role=admin";
  return "/login";
}

// A 401 from our API always means "this session is no longer valid" —
// expired/invalid access token, or a token whose refresh has already been
// tried and failed. Every service file just throws the server's message and
// lets the page render it as inline text, which is wrong here: a dead
// session should kill itself and send the user to sign in again, not show
// an error on a page they can't use. Wrapping fetch once here catches every
// call site without having to touch each service file individually.
let unauthorizedHandlerInstalled = false;

export function installUnauthorizedHandler() {
  if (unauthorizedHandlerInstalled) return;
  unauthorizedHandlerInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;

    const isOwnApiCall = url.startsWith(API_URL);
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (response.status === 401 && isOwnApiCall && !isAuthEndpoint) {
      const staffId = getUser()?.staffId;
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      purgeOfflineCredentials(staffId);

      // A 401 raised by the background offline-sync sweep (AutoSync, running
      // on every page regardless of what the nurse is currently doing) must
      // not yank them away from in-progress foreground work — their queued
      // referrals/patients stay safely in IndexedDB either way, and the sync
      // will just fail this round and retry once they sign back in. Only a
      // 401 from a request the current page itself made should force the
      // redirect; route guards will catch the cleared session on next
      // navigation regardless.
      if (!isSyncInProgress()) {
        // Deferred, not immediate: the caller's own catch block (e.g.
        // NewReferral/RegisterPatient falling back to a local offline draft
        // on a 401) needs a turn of the event loop to finish its IndexedDB
        // write before the page unloads. A few ms is enough for that and
        // still reads as instant to the user.
        setTimeout(() => {
          const target = loginPathFor(window.location.pathname);
          if (window.location.pathname !== target) {
            window.location.href = target;
          }
        }, 300);
      }
    }

    return response;
  };
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

// Self-service "forgot password" — available to any role (nurse included,
// if they have an email on file; see OTP_REQUIRED_ROLES on the backend,
// which this deliberately does NOT check, unlike login). The server always
// returns the same message regardless of whether the Staff ID exists or
// has an email, so there's nothing role/account-specific to branch on here.
export async function requestPasswordReset(staffId: string) {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
}

export async function resetPasswordWithCode(staffId: string, code: string, newPassword: string) {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId, code, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  // This device's cached offline-login hash (if any) is now stale — the
  // real password just changed server-side. Purge it so a later
  // loginOffline attempt on this device can't succeed with the old
  // password; the next online login re-establishes offline capability
  // against the new one.
  await purgeOfflineCredentials(staffId);

  return data;
}
