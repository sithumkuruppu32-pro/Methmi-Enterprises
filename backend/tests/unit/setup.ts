import { randomBytes } from "node:crypto";

// These values exist only in the test process. Never load normal .env files.
process.env.NODE_ENV = "test";
process.env.ADMIN_PASSWORD = randomBytes(24).toString("hex");
process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString("hex");
process.env.SUPABASE_URL = "http://127.0.0.1:1";
process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-only-not-a-live-key";
process.env.SUPABASE_STORAGE_BUCKET = "unit-tests-only";
for (const key of ["RESEND_API_KEY", "BUSINESS_EMAIL", "EMAIL_FROM", "COOKIE_DOMAIN", "COOKIE_SECURE", "COOKIE_SAMESITE"]) delete process.env[key];
