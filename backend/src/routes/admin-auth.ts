import { createSupabaseAuthClient, getSupabase } from "../lib/supabase.js";
import { asyncRoute } from "../lib/http.js";
import { loginInputSchema, firstErrorMessage } from "../lib/validation.js";
import { Router, type CookieOptions } from "express";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,

  isAuthorizedAdminSession,
} from "../lib/admin-auth.js";

const router = Router();

// Lax is fine while the frontend proxies /api/*. Hosting the API on a
// different site needs COOKIE_SAMESITE=none and COOKIE_SECURE=true.
type SameSite = "lax" | "strict" | "none";

function readSameSite(): SameSite {
  const value = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  return value === "none" || value === "strict" ? value : "lax";
}

function sessionCookieOptions(): CookieOptions {
  const sameSite = readSameSite();
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    sameSite === "none" ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

router.post("/login", asyncRoute(async (req, res) => {
  const parsed = loginInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: firstErrorMessage(parsed.error) }); return; }
  const { email, password } = parsed.data;
  const auth = createSupabaseAuthClient();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email) {
    res.status(error?.status === 429 ? 429 : 401).json({
      error: error?.status === 429 ? "Too many sign-in attempts. Please try again later." : "Invalid email or password.",
    });
    return;
  }

  const { data: admin, error: adminError } = await getSupabase().from("admins")
    .select("email").eq("email", data.user.email.toLowerCase()).maybeSingle();
  // No Supabase bearer token is sent to the browser; this app uses its own session.
  await auth.auth.signOut({ scope: "local" });
  if (adminError) {
    res.status(503).json({ error: "Admin access is not configured. Check the Supabase admins table." });
    return;
  }
  if (!admin) {
    res.status(403).json({ error: "This account is not authorized as an admin." });
    return;
  }
  const token = await createSessionToken(data.user.id);

  res.cookie(ADMIN_SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  });

  res.json({ ok: true });
}));

router.post("/logout", (_req, res) => {
  res.cookie(ADMIN_SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

router.get("/session", asyncRoute(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const valid = await isAuthorizedAdminSession(req.cookies?.[ADMIN_SESSION_COOKIE]);
  res.status(valid ? 200 : 401).json({ authenticated: valid });
}));

export default router;
