import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const env = loadEnv(path.join(root, ".env.local"));
const n8nBaseUrl = env.N8N_BASE_URL || "https://partincho.app.n8n.cloud";
const n8nApiKey = process.env.N8N_API_KEY || env.N8N_API_KEY || "";

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const checks = [];

if (!supabaseUrl || !supabaseKey) {
  fail("supabase.env", "Missing SUPABASE_URL/SUPABASE_SECRET_KEY");
  finish();
}

const supabase = createClient(supabaseUrl, supabaseKey);

await auditSupabase();

if (n8nApiKey) {
  await auditN8n();
} else {
  warn("n8n.credentials", "N8N_API_KEY not provided; skipped live n8n workflow audit");
}

finish();

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

async function auditSupabase() {
  const { data: ragAudit, error: ragError } = await supabase.rpc("rag_security_audit");
  if (ragError) {
    fail("supabase.rag_audit", ragError.message);
  } else {
    const audit = ragAudit?.[0] ?? {};
    expect("supabase.rag_sensitive_zero", Number(audit.sensitive_recoverable_chunks ?? -1) === 0, audit);
    expect("supabase.rag_orphans_zero", Number(audit.orphan_chunks ?? -1) === 0, audit);
    expect("supabase.rag_public_chunks_present", Number(audit.public_chunks ?? 0) > 0, audit);
  }

  const phoneMethods = await countRows("contacto_metodos", (query) => query.in("tipo", ["movil", "whatsapp", "fijo"]));
  const whatsappActivities = await countRows("actividades", (query) => query.eq("tipo", "WhatsApp").is("deleted_at", null));
  const whatsappInbound = await countRows("actividades", (query) =>
    query.eq("tipo", "WhatsApp").eq("direccion", "inbound").is("deleted_at", null)
  );
  const whatsappOutbound = await countRows("actividades", (query) =>
    query.eq("tipo", "WhatsApp").eq("direccion", "outbound").is("deleted_at", null)
  );
  const linkedActivities = await countRows("actividades", (query) =>
    query.not("cuenta_id", "is", null).is("deleted_at", null)
  );

  expect("supabase.phone_methods_present", phoneMethods > 0, { phoneMethods });
  note("supabase.whatsapp_activity_counts", { whatsappActivities, whatsappInbound, whatsappOutbound, linkedActivities });
  if (whatsappOutbound === 0) {
    warn("supabase.whatsapp_outbound_missing", "No outbound WhatsApp activities yet; run a physical n8n WhatsApp test");
  }
  if (linkedActivities === 0) {
    warn("supabase.whatsapp_linkage_missing", "No linked CRM activities yet; personalization evidence needs a physical WhatsApp test");
  }
}

async function countRows(table, applyFilter) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  query = applyFilter ? applyFilter(query) : query;
  const { count, error } = await query;
  if (error) {
    fail(`supabase.count.${table}`, error.message);
    return 0;
  }
  return count ?? 0;
}

async function auditN8n() {
  const whatsapp = await n8n(`/api/v1/workflows/MrB7ole5rzayU3MI`);
  const ragLoader = await n8n(`/api/v1/workflows/W86DZM3VpnIwuIJU`);

  expect("n8n.whatsapp.active", whatsapp.active === true, { active: whatsapp.active });
  expect("n8n.rag_loader.active", ragLoader.active === true, { active: ragLoader.active });

  const whatsappNodes = new Map(whatsapp.nodes.map((node) => [node.name, node]));
  const ragNodes = new Map(ragLoader.nodes.map((node) => [node.name, node]));

  const ragNode = whatsappNodes.get("RAG Catalogo");
  const triggerNode = whatsappNodes.get("WhatsApp Trigger");
  const identifyNode = whatsappNodes.get("Identificar Cliente");
  const openAiChatNode = whatsappNodes.get("OpenAI Chat Model");
  const openAiEmbeddingsNode = whatsappNodes.get("Embeddings OpenAI");
  const imageAnalyzeNode = whatsappNodes.get("Imagen Analizar");
  const adminNoticeNode = whatsappNodes.get("Aviso Administraci?n");
  const sendWhatsappNode = whatsappNodes.get("Enviar WhatsApp");
  const identifyQuery = identifyNode?.parameters?.query || "";
  const openAiChatModel = openAiChatNode?.parameters?.model?.value || openAiChatNode?.parameters?.model?.cachedResultName;
  const imageAnalyzeModel = imageAnalyzeNode?.parameters?.modelId?.value || imageAnalyzeNode?.parameters?.modelId?.cachedResultName;
  const ragTable = ragNode?.parameters?.tableName?.value || ragNode?.parameters?.tableName?.cachedResultName;

  expect("n8n.whatsapp.trigger_credentials", Boolean(triggerNode?.credentials), {});
  expect("n8n.whatsapp.identify_postgres_credentials", Boolean(identifyNode?.credentials), {});
  expect("n8n.whatsapp.identify_phone_lookup", /contacto_metodos/.test(identifyQuery) && /valor_norm/.test(identifyQuery), {});
  expect("n8n.whatsapp.identify_history_lookup", /public\.actividades/.test(identifyQuery) && /historial_reciente/.test(identifyQuery), {});
  expect("n8n.whatsapp.openai_chat_credentials", Boolean(openAiChatNode?.credentials), {});
  expect("n8n.whatsapp.openai_chat_model", openAiChatModel === "gpt-4.1-mini", { model: openAiChatModel });
  expect("n8n.whatsapp.openai_embeddings_credentials", Boolean(openAiEmbeddingsNode?.credentials), {});
  expect("n8n.whatsapp.image_model", !imageAnalyzeNode || imageAnalyzeModel === "gpt-4.1-mini", { model: imageAnalyzeModel });
  expect("n8n.whatsapp.supabase_vector_credentials", Boolean(ragNode?.credentials), {});
  expect("n8n.whatsapp.rag_table", ragTable === "documento_chunks", { tableName: ragTable });
  expect("n8n.whatsapp.send_credentials", Boolean(sendWhatsappNode?.credentials), {});
  expect(
    "n8n.whatsapp.admin_notice_send",
    Boolean(adminNoticeNode?.credentials) &&
      adminNoticeNode?.parameters?.resource === "message" &&
      adminNoticeNode?.parameters?.operation === "send",
    {
      resource: adminNoticeNode?.parameters?.resource,
      operation: adminNoticeNode?.parameters?.operation,
    }
  );
  if (env.WHATSAPP_PHONE_NUMBER_ID) {
    expect("n8n.whatsapp.phone_number_id_matches_env", sendWhatsappNode?.parameters?.phoneNumberId === env.WHATSAPP_PHONE_NUMBER_ID, {
      configured: sendWhatsappNode?.parameters?.phoneNumberId,
    });
  } else {
    warn("n8n.whatsapp.phone_number_id_env", "WHATSAPP_PHONE_NUMBER_ID not provided; skipped phone id comparison");
  }

  expect("n8n.whatsapp.rag_rpc", ragNode?.parameters?.options?.queryName === "match_documents_whatsapp", {
    queryName: ragNode?.parameters?.options?.queryName,
  });

  const entrada = whatsappNodes.get("Guardar Entrada");
  const salida = whatsappNodes.get("Guardar Interacci?n");
  const entradaQuery = entrada?.parameters?.query || "";
  const salidaQuery = salida?.parameters?.query || "";

  expect("n8n.whatsapp.guardar_entrada_present", Boolean(entrada), {});
  expect("n8n.whatsapp.guardar_entrada_credentials", Boolean(entrada?.credentials), {});
  expect("n8n.whatsapp.guardar_salida_credentials", Boolean(salida?.credentials), {});
  expect("n8n.whatsapp.inbound_before_agent", whatsapp.connections?.["Guardar Entrada"]?.main?.[0]?.[0]?.node === "AI Agent", {
    connection: whatsapp.connections?.["Guardar Entrada"],
  });
  expect("n8n.whatsapp.inbound_always_outputs", entradaQuery.includes("EXISTS (SELECT 1 FROM ins) AS inserted"), {});
  expect("n8n.whatsapp.outbound_saved", /'outbound'/.test(salidaQuery) && salidaQuery.includes(":reply"), {});
  expect("n8n.whatsapp.channel_raw_phone", !/channel_raw\s*=\s*'whatsapp'/.test(`${entradaQuery}\n${salidaQuery}`), {});

  const preparar = whatsappNodes.get("Preparar Respuesta");
  const prepararCode = preparar?.parameters?.jsCode || "";
  expect("n8n.whatsapp.derive_guard", prepararCode.includes("commercialIntent") && prepararCode.includes("leakedCommercialData"), {});

  const trigger = ragNodes.get("Google Drive Trigger");
  expect("n8n.rag_loader.folder_rag", trigger?.parameters?.folderToWatch?.cachedResultName === "RAG", {
    folder: trigger?.parameters?.folderToWatch?.cachedResultName,
  });
  expect("n8n.rag_loader.uses_rag_ingest", Boolean(ragNodes.get("rag_ingest")), {});
  expect("n8n.rag_loader.openai_embeddings_http", ragNodes.get("Generar Embedding")?.parameters?.url === "https://api.openai.com/v1/embeddings", {});

  const executions = await n8n("/api/v1/executions?workflowId=MrB7ole5rzayU3MI&limit=10");
  const recentExecutions = (executions.data || []).map((execution) => ({
    id: execution.id,
    status: execution.status,
    startedAt: execution.startedAt,
    stoppedAt: execution.stoppedAt,
  }));
  note("n8n.whatsapp.recent_executions", recentExecutions);
  if (recentExecutions[0]?.status !== "success") {
    warn("n8n.whatsapp.latest_execution_not_success", "Latest WhatsApp execution is not success; run a new physical WhatsApp test");
  }

  const recentExecutionDetails = [];
  for (const execution of recentExecutions.slice(0, 10)) {
    const detail = await n8n(`/api/v1/executions/${execution.id}?includeData=true`);
    const runData = detail.data?.resultData?.runData || {};
    recentExecutionDetails.push({
      id: execution.id,
      status: execution.status,
      hasAgent: Object.hasOwn(runData, "AI Agent"),
      hasRag: Object.hasOwn(runData, "RAG Catalogo"),
      hasAdminNotice: Object.hasOwn(runData, "Aviso Administraci?n"),
      hasWhatsappSend: Object.hasOwn(runData, "Enviar WhatsApp"),
      hasOutboundSave: Object.hasOwn(runData, "Guardar Interacci?n"),
    });
  }
  note("n8n.whatsapp.recent_execution_paths", recentExecutionDetails);
  if (!recentExecutionDetails.some((execution) => execution.status === "success" && execution.hasAgent && execution.hasWhatsappSend && execution.hasOutboundSave)) {
    warn("n8n.whatsapp.no_recent_full_conversation", "No recent successful full WhatsApp conversation path found");
  }
  if (!recentExecutionDetails.some((execution) => execution.status === "success" && execution.hasRag)) {
    warn("n8n.whatsapp.no_recent_rag_path", "No recent successful WhatsApp RAG path found");
  }
  if (!recentExecutionDetails.some((execution) => execution.status === "success" && execution.hasAdminNotice)) {
    warn("n8n.whatsapp.no_recent_derivation_path", "No recent successful WhatsApp derivation email path found");
  }
}

async function n8n(pathname) {
  const response = await fetch(`${n8nBaseUrl}${pathname}`, {
    headers: { "X-N8N-API-KEY": n8nApiKey },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`n8n ${response.status}: ${json.message || "request failed"}`);
  return json;
}

function expect(name, pass, detail) {
  checks.push({ name, status: pass ? "pass" : "fail", detail });
}

function fail(name, message) {
  checks.push({ name, status: "fail", detail: { message } });
}

function warn(name, message) {
  checks.push({ name, status: "warn", detail: { message } });
}

function note(name, detail) {
  checks.push({ name, status: "note", detail });
}

function finish() {
  const failures = checks.filter((check) => check.status === "fail");
  console.log(JSON.stringify({ ok: failures.length === 0, checks }, null, 2));
  process.exit(failures.length === 0 ? 0 : 1);
}
