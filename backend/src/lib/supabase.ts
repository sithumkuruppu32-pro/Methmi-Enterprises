import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.js";

const isPlaceholder = (value: string) =>
  !value || value.includes("YOUR_PROJECT_ID") || value.includes("YOUR_SUPABASE_SERVICE_ROLE_KEY");

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "site-images";

export function isSupabaseConfigured() {
  return !isPlaceholder(getSupabaseUrl()) && !isPlaceholder(getServiceRoleKey());
}

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.local.",
    );
  }
}

let client: SupabaseClient<Database> | null = null;
export function getSupabase(){
  assertSupabaseConfigured();
  if(!client) {
    client=createClient<Database>(getSupabaseUrl(),getServiceRoleKey(),{
      auth:{persistSession:false,autoRefreshToken:false},
    });
  }
  return client;
}
export function canWriteToSupabase(){ return true; }

// A fresh client per login prevents user auth from replacing the shared service-role session.
export function createSupabaseAuthClient() {
  assertSupabaseConfigured();
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
