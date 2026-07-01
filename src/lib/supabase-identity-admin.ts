import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.IDENTITY_SUPABASE_URL ||
  process.env.PLATFORM_SUPABASE_URL ||
  process.env.CREDENTIALS_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_URL ||
  "";
const serviceRoleKey =
  process.env.IDENTITY_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.PLATFORM_SUPABASE_SECRET_KEY ||
  process.env.CREDENTIALS_SUPABASE_SECRET_KEY ||
  "";

let client: ReturnType<typeof createClient> | null = null;

export function getIdentityAdminClient() {
  if (client) return client;
  if (!supabaseUrl || !serviceRoleKey) return null;
  client = createClient(supabaseUrl, serviceRoleKey);
  return client;
}
