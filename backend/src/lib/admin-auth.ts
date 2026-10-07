// Supabase authenticates credentials; the app issues an HttpOnly signed session.
export const ADMIN_SESSION_COOKIE = "methmi_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60; // 1 hour; sign in again after expiry

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("Set ADMIN_SESSION_SECRET to at least 32 random characters in both backend and frontend environment files.");
  }
  return secret;
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bufferToHex(signature);
}

export async function createSessionToken(userId: string): Promise<string> {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${expiresAt}.${userId}`;
  const signature = await hmacHex(getSecret(), payload);
  return `${payload}.${signature}`;
}

/** Verifies a session token's signature and expiry. */
export async function isSessionTokenValid(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expires, userId, signature] = parts;
  if (!/^\d+$/.test(expires) || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const payload = `${expires}.${userId}`;

  const expected = await hmacHex(getSecret(), payload);
  if (expected.length !== signature.length) return false;

  // Constant-time-ish comparison.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}

/** Every protected API call rechecks membership, so deleting an admin revokes access. */
export async function isAuthorizedAdminSession(token: string | undefined | null): Promise<boolean> {
  if (!await isSessionTokenValid(token)) return false;
  const userId = token!.split(".")[1];
  const { getSupabase } = await import("./supabase.js");
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return false;
  const { data: admin, error: adminError } = await supabase.from("admins")
    .select("email").eq("email", data.user.email.toLowerCase()).maybeSingle();
  if (adminError) throw new Error("Could not verify admin access. Check the Supabase admins table.");
  return Boolean(admin);
}
