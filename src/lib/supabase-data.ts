import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: ReturnType<typeof createClient> | null = null;

export function getDataAdminClient() {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  return client;
}
