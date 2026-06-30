import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "crm-rosa-reina",
    supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
    openAiConfigured: Boolean(env.openAiApiKey),
    whatsappConfigured: Boolean(env.whatsappAccessToken && env.whatsappPhoneNumberId && env.whatsappVerifyToken),
  });
}
