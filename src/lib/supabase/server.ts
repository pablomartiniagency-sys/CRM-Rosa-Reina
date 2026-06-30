import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createServerSupabaseClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey || env.supabaseAnonKey === "pon_aqui_tu_anon_key") {
    return null;
  }
  try {
    const cookieStore = await cookies();
    return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    });
  } catch {
    return null;
  }
}
