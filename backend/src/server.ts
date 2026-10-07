import dotenv from "dotenv";
import { assertSupabaseConfigured } from "./lib/supabase.js";

dotenv.config({ path: ".env.local" });
dotenv.config();
try { assertSupabaseConfigured(); } catch (error) {
  console.error(`[api] ${error instanceof Error ? error.message : "Invalid database configuration."}`);
  process.exit(1);
}
// Load configuration before route modules read storage settings.
const { createApp } = await import("./app.js");
const port = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);
createApp().listen(port, () => console.log(`Methmi API listening on http://localhost:${port}`));
