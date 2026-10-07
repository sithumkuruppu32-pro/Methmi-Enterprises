import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parse } from "dotenv";

// Explicit test-only configuration. No fallback to the application's .env files.
const file = new URL("../../.env.test.local", import.meta.url);
const config = existsSync(file) ? parse(readFileSync(file)) : {};
const url = process.env.TEST_SUPABASE_URL || config.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || config.TEST_SUPABASE_SERVICE_ROLE_KEY;
const confirmation = process.env.TEST_DATABASE_CONFIRM || config.TEST_DATABASE_CONFIRM;
if (!url || !key || confirmation !== "ISOLATED_TEST_DATABASE") {
  throw new Error("Real database tests require backend/.env.test.local with TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_CONFIRM=ISOLATED_TEST_DATABASE. See TESTING.md. Never use a live project.");
}
const parsedUrl = new URL(url);
if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid test database URL.");
if (process.env.SUPABASE_URL && new URL(process.env.SUPABASE_URL).origin === parsedUrl.origin) {
  throw new Error("Test database URL matches the application's inherited SUPABASE_URL. Use a separate project and clear production variables before running tests.");
}
process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = key;
process.env.SUPABASE_STORAGE_BUCKET = `ica5-tests-${randomBytes(8).toString("hex")}`;
process.env.ADMIN_PASSWORD = randomBytes(24).toString("hex");
process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString("hex");
for (const name of ["RESEND_API_KEY", "BUSINESS_EMAIL", "EMAIL_FROM", "COOKIE_DOMAIN", "COOKIE_SECURE", "COOKIE_SAMESITE"]) delete process.env[name];
