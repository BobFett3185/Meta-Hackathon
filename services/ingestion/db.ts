import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
/** Service-role client. Server-side only: never import this from the Expo app. */
export function adminDb(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return (client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

export function check<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}
