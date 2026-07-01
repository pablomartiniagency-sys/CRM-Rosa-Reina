import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const env = { ...loadEnv(path.join(root, ".env.local")), ...process.env };
const seedId = env.DEMO_SEED_ID || "rosa-reina-demo-v1";

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublicKey =
  env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const checks = [];
const notes = [];

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

record("env.supabase_admin", Boolean(supabaseUrl && supabaseKey), "Supabase admin configurado para CRM/RAG/WhatsApp.");
record("env.supabase_public", Boolean(supabaseUrl && supabasePublicKey), "Supabase publico configurado para cliente.");
record("env.openai", usable(env.OPENAI_API_KEY), "OpenAI listo para RAG/asistente.");
record(
  "env.whatsapp",
  usable(env.WHATSAPP_VERIFY_TOKEN) && usable(env.WHATSAPP_PHONE_NUMBER_ID) && usable(env.WHATSAPP_ACCESS_TOKEN),
  "WhatsApp local configurado; las pruebas productivas siguen en n8n."
);

const identityUrl = env.NEXT_PUBLIC_IDENTITY_SUPABASE_URL || "";
record(
  "env.identity",
  usable(identityUrl) && usable(env.NEXT_PUBLIC_IDENTITY_SUPABASE_ANON_KEY),
  "Identidad/accesos configurados para login real.",
  identityUrl ? { url: identityUrl } : {}
);
if (!identityUrl) {
  notes.push("Identidad real pendiente: si Rosa Reina usa zbecidvekwtgnxfxdqhq, configura NEXT_PUBLIC_IDENTITY_SUPABASE_URL y keys de identidad.");
}

let summary = {};
if (supabase) {
  summary = await collectSupabaseStatus();
}

const gates = {
  crm_visible: pass("env.supabase_admin") && (summary.accounts ?? 0) > 0 && (summary.contacts ?? 0) > 0,
  demo_ready: (summary.demo?.accounts ?? 0) > 0 && (summary.demo?.activities ?? 0) > 0,
  rag_safe:
    (summary.rag?.publicChunks ?? 0) > 0 &&
    Number(summary.rag?.sensitiveRecoverableChunks ?? -1) === 0 &&
    Number(summary.rag?.orphanChunks ?? -1) === 0,
  whatsapp_evidence:
    (summary.whatsapp?.inbound ?? 0) > 0 &&
    (summary.whatsapp?.outbound ?? 0) > 0 &&
    (summary.whatsapp?.linked ?? 0) > 0,
  email_simulation_ready: (summary.email?.activities ?? 0) > 0 && (summary.email?.reviewAdmin ?? 0) > 0,
  imports_ready: summary.imports?.rowApplicationColumns === true,
  identity_ready: pass("env.identity"),
};

const nextActions = buildNextActions(gates);

console.log(
  JSON.stringify(
    {
      ok: Object.entries(gates)
        .filter(([name]) => name !== "identity_ready")
        .every(([, value]) => value),
      project: supabaseUrl ? supabaseUrl.replace(/^https:\/\//, "") : null,
      checks,
      gates,
      summary,
      notes,
      nextActions,
    },
    null,
    2
  )
);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function usable(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return !normalized.startsWith("__n8n_BLANK_VALUE") && !normalized.includes("REEMPLAZAR") && !normalized.includes("TU_");
}

function record(name, ok, message, detail = {}) {
  checks.push({ name, status: ok ? "pass" : "warn", message, detail });
}

function pass(name) {
  return checks.some((check) => check.name === name && check.status === "pass");
}

async function collectSupabaseStatus() {
  const [
    accounts,
    contacts,
    leads,
    orders,
    activities,
    whatsapp,
    email,
    demo,
    rag,
    imports,
  ] = await Promise.all([
    countRows("cuentas", (query) => query.is("deleted_at", null)),
    countRows("contactos", (query) => query.is("deleted_at", null)),
    countRows("leads", (query) => query.is("deleted_at", null)),
    countRows("pedidos"),
    countRows("actividades", (query) => query.is("deleted_at", null)),
    collectWhatsappStatus(),
    collectEmailStatus(),
    collectDemoStatus(),
    collectRagStatus(),
    collectImportStatus(),
  ]);

  return { accounts, contacts, leads, orders, activities, whatsapp, email, demo, rag, imports };
}

async function collectWhatsappStatus() {
  const [inbound, outbound, linked] = await Promise.all([
    countRows("actividades", (query) => query.eq("tipo", "WhatsApp").eq("direccion", "inbound").is("deleted_at", null)),
    countRows("actividades", (query) => query.eq("tipo", "WhatsApp").eq("direccion", "outbound").is("deleted_at", null)),
    countRows("actividades", (query) => query.eq("tipo", "WhatsApp").not("cuenta_id", "is", null).is("deleted_at", null)),
  ]);
  return { inbound, outbound, linked };
}

async function collectEmailStatus() {
  const [activities, reviewAdmin, withAttachments] = await Promise.all([
    countRows("actividades", (query) => query.eq("tipo", "Email").is("deleted_at", null)),
    countRows("actividades", (query) => query.eq("tipo", "Email").eq("categoria", "revision_admin").is("deleted_at", null)),
    countRows("actividades", (query) => query.eq("tipo", "Email").eq("has_attachments", true).is("deleted_at", null)),
  ]);
  return { activities, reviewAdmin, withAttachments };
}

async function collectDemoStatus() {
  const { data: demoContacts, error } = await supabase
    .from("contactos")
    .select("id")
    .contains("custom", { demo_seed_id: seedId })
    .is("deleted_at", null);
  if (error) throw error;
  const ids = (demoContacts ?? []).map((contact) => contact.id);

  const [accounts, contacts, contactMethods, leads, orders, activities] = await Promise.all([
    countRows("cuentas", (query) => query.contains("custom", { demo_seed_id: seedId }).is("deleted_at", null)),
    countRows("contactos", (query) => query.contains("custom", { demo_seed_id: seedId }).is("deleted_at", null)),
    ids.length ? countRows("contacto_metodos", (query) => query.in("contacto_id", ids)) : 0,
    countRows("leads", (query) => query.contains("custom", { demo_seed_id: seedId }).is("deleted_at", null)),
    countRows("pedidos", (query) => query.contains("custom", { demo_seed_id: seedId })),
    countRows("actividades", (query) => query.eq("external_thread_id", seedId).is("deleted_at", null)),
  ]);
  return { accounts, contacts, contactMethods, leads, orders, activities };
}

async function collectRagStatus() {
  const { data, error } = await supabase.rpc("rag_security_audit");
  if (error) {
    notes.push(`RAG audit error: ${error.message}`);
    return {};
  }
  const audit = data?.[0] ?? {};
  return {
    liveDocuments: Number(audit.live_documents ?? 0),
    publicChunks: Number(audit.public_chunks ?? 0),
    sensitiveRecoverableChunks: Number(audit.sensitive_recoverable_chunks ?? -1),
    orphanChunks: Number(audit.orphan_chunks ?? -1),
    privateBotSafeChunks: Number(audit.private_bot_safe_chunks ?? 0),
  };
}

async function collectImportStatus() {
  const { data, error } = await supabase.rpc("critical_import_private_audit");
  if (error) {
    notes.push(`Import audit error: ${error.message}`);
    return {};
  }
  const audit = data?.[0] ?? {};
  return {
    rowApplicationColumns: audit.row_application_columns === true,
    tarifasPrivadas: Number(audit.tarifas_privadas_count ?? 0),
    condiciones: Number(audit.condiciones_count ?? 0),
    documentosPrivados: Number(audit.documentos_privados_count ?? 0),
  };
}

async function countRows(table, applyFilter) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  query = applyFilter ? applyFilter(query) : query;
  const { count, error } = await query;
  if (error) {
    notes.push(`Count error on ${table}: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

function buildNextActions(gates) {
  const actions = [];
  if (!gates.demo_ready) actions.push("Ejecuta npm run demo:seed:medium para poblar una demo operativa.");
  if (!gates.rag_safe) actions.push("Revisa RAG: debe haber chunks publicos y 0 sensibles/huerfanos.");
  if (!gates.whatsapp_evidence) actions.push("Ejecuta una prueba fisica WhatsApp desde n8n y luego npm run audit:critical.");
  if (!gates.email_simulation_ready) actions.push("Completa/audita flujo email n8n: guardar Email, resumen IA y revision_admin.");
  if (!gates.imports_ready) actions.push("Revisa migraciones de importaciones criticas y RPC private audit.");
  if (!gates.identity_ready) actions.push("Configura identidad real de Rosa Reina; si aplica, usa el proyecto zbecidvekwtgnxfxdqhq.");
  return actions;
}
