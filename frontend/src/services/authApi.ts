import API_URL from "./api";
import { db } from "./db";

const PBKDF2_ITERATIONS = 100_000;

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
// clear) alongside their last-issued token, so `loginOffline` can sign
// them back in on this device with no network.
async function cacheCredentials(
  staffId: string,
  password: string,
  user: any,
  token: string
) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);

  await db.credentials.put({
    staffId,
    passwordHash,
    salt,
    user,
    token,
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
  localStorage.setItem("user", JSON.stringify(data.user));

  // Best-effort: never let credential caching break a successful login.
  try {
    await cacheCredentials(staffId, password, data.user, data.token);
  } catch (err) {
    console.error(err);
  }

  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  const stored = localStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
