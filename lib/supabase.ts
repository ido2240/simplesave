// Server-only Supabase data client.
// The anon key is used from the server (never shipped to the browser); demo auth
// is a mock cookie session (see lib/session.ts). Production would swap to
// Supabase Auth + RLS with @supabase/ssr.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
