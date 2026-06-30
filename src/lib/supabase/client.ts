import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey || env.supabaseAnonKey === "pon_aqui_tu_anon_key") {
    if (typeof window !== "undefined") console.warn("Supabase no configurado.");
    return null;
  }
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

export function isSupabaseReady() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseAnonKey !== "pon_aqui_tu_anon_key");
}
