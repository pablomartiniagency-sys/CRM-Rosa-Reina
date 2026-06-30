import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_URL || "https://szckjmeawinxpqwqhylf.supabase.co";
const serviceRoleKey = process.env.IDENTITY_SUPABASE_SERVICE_ROLE_KEY || "";

let client: ReturnType<typeof createClient> | null = null;

export function getIdentityAdminClient() {
  if (client) return client;
  if (!serviceRoleKey) return null;
  client = createClient(supabaseUrl, serviceRoleKey);
  return client;
}
