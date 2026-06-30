import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_URL || "https://szckjmeawinxpqwqhylf.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_ANON_KEY || "";

let client: ReturnType<typeof createClient> | null = null;

export function createIdentityClient() {
  if (client) return client;
  if (!supabaseAnonKey) return null;
  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
