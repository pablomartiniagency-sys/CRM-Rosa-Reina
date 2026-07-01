export const env = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
  supabaseServiceRoleKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL || "",
  platformSupabaseUrl: process.env.PLATFORM_SUPABASE_URL || process.env.CREDENTIALS_SUPABASE_URL || "",
  platformSupabasePublishableKey:
    process.env.PLATFORM_SUPABASE_PUBLISHABLE_KEY || process.env.CREDENTIALS_SUPABASE_PUBLISHABLE_KEY || "",
  platformSupabaseSecretKey:
    process.env.PLATFORM_SUPABASE_SECRET_KEY || process.env.CREDENTIALS_SUPABASE_SECRET_KEY || "",
  platformSupabaseJwksUrl: process.env.PLATFORM_SUPABASE_JWKS_URL || process.env.CREDENTIALS_SUPABASE_JWKS_URL || "",
  identitySupabaseUrl: process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_URL || "",
  identitySupabasePublishableKey:
    process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_IDENTITY_SUPABASE_ANON_KEY ||
    "",
  identitySupabaseServiceRoleKey: process.env.IDENTITY_SUPABASE_SERVICE_ROLE_KEY || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  adminEscalationEmail: process.env.ADMIN_ESCALATION_EMAIL || "rosareina.info@gmail.com",
};

type IntegrationStatus = {
  ready: boolean;
  missing: string[];
  invalid: string[];
};

function hasUsableValue(value: string | undefined, variableName: string) {
  const normalized = (value ?? "").trim();
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  return !(
    normalized.startsWith("__n8n_BLANK_VALUE") ||
    normalized === "sk-..." ||
    lower.includes("tu_") ||
    lower.includes("_aqui") ||
    lower.includes("define_un_token") ||
    lower.includes("phone_number_id_de_meta") ||
    lower.includes("token_permanente_de_meta") ||
    lower === variableName.toLowerCase()
  );
}

function statusFor(required: Array<[string, string | undefined]>): IntegrationStatus {
  const missing = required.filter(([, value]) => !(value ?? "").trim()).map(([name]) => name);
  const invalid = required
    .filter(([name, value]) => (value ?? "").trim() && !hasUsableValue(value, name))
    .map(([name]) => name);

  return {
    ready: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

export function getIntegrationStatus() {
  const supabase = statusFor([
    ["SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl],
    ["SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
  ]);
  const supabasePublic = statusFor([
    ["SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl],
    [
      "SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      env.supabaseAnonKey,
    ],
  ]);
  const platformVault = statusFor([
    ["PLATFORM_SUPABASE_URL or CREDENTIALS_SUPABASE_URL", env.platformSupabaseUrl],
    ["PLATFORM_SUPABASE_SECRET_KEY or CREDENTIALS_SUPABASE_SECRET_KEY", env.platformSupabaseSecretKey],
  ]);
  const identity = statusFor([
    ["NEXT_PUBLIC_IDENTITY_SUPABASE_URL", env.identitySupabaseUrl],
    [
      "NEXT_PUBLIC_IDENTITY_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_IDENTITY_SUPABASE_ANON_KEY",
      env.identitySupabasePublishableKey,
    ],
  ]);
  const openAi = statusFor([["OPENAI_API_KEY", env.openAiApiKey]]);
  const whatsapp = statusFor([
    ["WHATSAPP_VERIFY_TOKEN", env.whatsappVerifyToken],
    ["WHATSAPP_PHONE_NUMBER_ID", env.whatsappPhoneNumberId],
    ["WHATSAPP_ACCESS_TOKEN", env.whatsappAccessToken],
  ]);

  return {
    supabase,
    supabasePublic,
    platformVault,
    identity,
    openAi,
    whatsapp,
    readiness: {
      crmViews: supabase.ready,
      platformVault: platformVault.ready,
      identityLogin: identity.ready,
      ragAssistant: supabase.ready && openAi.ready,
      whatsappWebhook: supabase.ready && openAi.ready && whatsapp.ready,
    },
  };
}
