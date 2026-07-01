import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/env";

export async function GET() {
  const integrations = getIntegrationStatus();

  return NextResponse.json({
    ok: true,
    app: "crm-rosa-reina",
    supabaseConfigured: integrations.supabase.ready,
    platformVaultConfigured: integrations.platformVault.ready,
    identityConfigured: integrations.identity.ready,
    openAiConfigured: integrations.openAi.ready,
    whatsappConfigured: integrations.whatsapp.ready,
    integrations,
  });
}
