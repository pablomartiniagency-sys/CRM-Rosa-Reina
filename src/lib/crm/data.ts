import { getDataAdminClient } from "@/lib/supabase-data";
import { createEmbedding } from "@/lib/crm/openai";
import { normalizePhone } from "@/lib/crm/security";
import type {
  Account,
  Activity,
  BotSafeKnowledgeMatch,
  Contact,
  CriticalImportApplyResult,
  CriticalImportBatch,
  CriticalImportRow,
  DashboardSnapshot,
  Lead,
  Order,
  RagAudit,
  RagDocument,
  SetupIssue,
} from "@/types/crm";

type Supabase = NonNullable<ReturnType<typeof getDataAdminClient>>;

export function getRequiredDataClient(): Supabase {
  const client = getDataAdminClient();
  if (!client) {
    throw new Error("Supabase data plane is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

type LooseRpcClient = {
  rpc: (name: string, args?: unknown) => Promise<{ data: unknown; error: Error | null }>;
};

type LooseInsertTable = {
  insert: (value: unknown) => Promise<{ error: Error | null }>;
};

type LooseSingleInsertTable = {
  insert: (value: unknown) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: Error | null }>;
    };
  };
};

const DATA_PLANE_SETUP_ISSUES: SetupIssue[] = [
  {
    code: "missing_supabase_service_role",
    variable: "SUPABASE_SERVICE_ROLE_KEY",
    message: "Conecta Supabase admin para ver datos reales del CRM.",
  },
];

export function isDataPlaneConfigurationError(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase data plane is not configured");
}

export function createSetupRagAudit(): RagAudit {
  return {
    dataMode: "setup",
    setupIssues: DATA_PLANE_SETUP_ISSUES,
    liveDocuments: [],
    publicChunks: 0,
    sensitiveRecoverableChunks: 0,
    orphanChunks: 0,
    privateBotSafeChunks: 0,
  };
}

export function createSetupDashboardSnapshot(): DashboardSnapshot {
  return {
    dataMode: "setup",
    setupIssues: DATA_PLANE_SETUP_ISSUES,
    accounts: [],
    contacts: [],
    leads: [],
    orders: [],
    activities: [],
    ragAudit: createSetupRagAudit(),
    counts: {
      accounts: 0,
      contacts: 0,
      contactMethods: 0,
      leads: 0,
      orders: 0,
      activities: 0,
      ragDocuments: 0,
    },
  };
}

async function countRows(client: Supabase, table: string, deletedAt = true) {
  let query = client.from(table).select("*", { count: "exact", head: true });
  if (deletedAt) query = query.is("deleted_at", null);
  const { count } = await query;
  return count ?? 0;
}

export async function fetchRagAudit(): Promise<RagAudit> {
  const client = getRequiredDataClient();

  const { data: rpcAudit } = await client.rpc("rag_security_audit");
  if (Array.isArray(rpcAudit) && rpcAudit[0]) {
    const audit = rpcAudit[0] as {
      live_documents?: number;
      public_chunks?: number;
      sensitive_recoverable_chunks?: number;
      orphan_chunks?: number;
      private_bot_safe_chunks?: number;
    };
    const docs = await fetchRagDocuments(client);
    return {
      dataMode: "live",
      liveDocuments: docs,
      publicChunks: Number(audit.public_chunks ?? 0),
      sensitiveRecoverableChunks: Number(audit.sensitive_recoverable_chunks ?? 0),
      orphanChunks: Number(audit.orphan_chunks ?? 0),
      privateBotSafeChunks: Number(audit.private_bot_safe_chunks ?? 0),
    };
  }

  const docs = await fetchRagDocuments(client);
  return {
    dataMode: "live",
    liveDocuments: docs,
    publicChunks: docs.reduce((sum, doc) => sum + (doc.chunks ?? 0), 0),
    sensitiveRecoverableChunks: 0,
    orphanChunks: 0,
    privateBotSafeChunks: 0,
  };
}

async function fetchRagDocuments(client: Supabase): Promise<RagDocument[]> {
  const { data: docs } = await client
    .from("documentos")
    .select("documento_id,tipo,titulo,fuente,metadata,created_at,updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(20);

  const documents = (docs ?? []) as RagDocument[];
  return Promise.all(
    documents.map(async (doc) => {
      const [chunkCount, embeddingSample] = await Promise.all([
        client
          .from("documento_chunks")
          .select("*", { count: "exact", head: true })
          .eq("documento_id", doc.documento_id),
        client
          .from("documento_chunks")
          .select("embedding")
          .eq("documento_id", doc.documento_id)
          .not("embedding", "is", null)
          .limit(1),
      ]);
      const sample = embeddingSample.data?.[0] as { embedding?: unknown } | undefined;
      return {
        ...doc,
        chunks: chunkCount.count ?? 0,
        dims: getVectorDimension(sample?.embedding),
      };
    })
  );
}

function getVectorDimension(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (typeof value !== "string") return null;
  const vector = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!vector) return null;
  return vector.split(",").filter(Boolean).length;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ImportApplyTarget =
  | { status: "applied"; table: string; recordId: string }
  | { status: "skipped"; table?: string; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeImportKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function rowData(row: CriticalImportRow): Record<string, unknown> {
  return {
    ...(isRecord(row.raw) ? row.raw : {}),
    ...(isRecord(row.mapped) ? row.mapped : {}),
  };
}

function getImportValue(row: CriticalImportRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeImportKey);
  for (const [key, value] of Object.entries(rowData(row))) {
    const normalizedKey = normalizeImportKey(key);
    if (normalizedAliases.includes(normalizedKey)) return value;
  }
  return undefined;
}

function pickText(row: CriticalImportRow, aliases: string[]) {
  const value = getImportValue(row, aliases);
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function pickNumber(row: CriticalImportRow, aliases: string[]) {
  const value = getImportValue(row, aliases);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;

  let text = String(value).trim();
  if (!text) return null;
  text = text.replace(/\s/g, "").replace(/[€$]/g, "").replace(/[^\d,.-]/g, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickDate(row: CriticalImportRow, aliases: string[]) {
  const value = getImportValue(row, aliases);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const esMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!esMatch) return null;

  const year = esMatch[3].length === 2 ? `20${esMatch[3]}` : esMatch[3];
  const month = esMatch[2].padStart(2, "0");
  const day = esMatch[1].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeOrderStatus(row: CriticalImportRow) {
  const value = normalizeImportKey(pickText(row, ["estado", "status", "estado_pedido"]));
  const statuses: Record<string, string> = {
    borrador: "borrador",
    pendiente: "pendiente_info",
    pendienteinfo: "pendiente_info",
    pendienteinformacion: "pendiente_info",
    presupuestado: "presupuestado",
    presupuesto: "presupuestado",
    confirmado: "confirmado",
    confirmada: "confirmado",
    enproceso: "en_proceso",
    proceso: "en_proceso",
    produccion: "en_proceso",
    cerrado: "cerrado",
    cerrada: "cerrado",
    cancelado: "cancelado",
    cancelada: "cancelado",
  };
  return statuses[value] ?? "pendiente_info";
}

function normalizeOrderChannel(row: CriticalImportRow) {
  const value = normalizeImportKey(pickText(row, ["canal_origen", "canal", "origen"]));
  const channels: Record<string, string> = {
    email: "email",
    correo: "email",
    whatsapp: "whatsapp",
    wa: "whatsapp",
    web: "web",
    formulario: "web",
    telefono: "telefono",
    llamada: "telefono",
  };
  return channels[value] ?? "otro";
}

function normalizeCurrency(row: CriticalImportRow) {
  const value = pickText(row, ["moneda", "currency", "divisa"]).toUpperCase();
  return value && /^[A-Z]{3}$/.test(value) ? value : "EUR";
}

function publicImportProvenance(batch: CriticalImportBatch, row: CriticalImportRow) {
  return {
    critical_import: {
      batch_id: batch.id,
      row_id: row.id ?? null,
      row_number: row.row_number,
      file_name: batch.file_name,
    },
  };
}

function isUuid(value: string) {
  return UUID_RE.test(value);
}

async function findAccountId(client: Supabase, row: CriticalImportRow) {
  const explicitId = pickText(row, ["cuenta_id", "account_id", "cliente_id"]);
  if (isUuid(explicitId)) {
    const { data } = await client.from("cuentas").select("id").eq("id", explicitId).maybeSingle();
    return ((data as { id?: string } | null)?.id) ?? null;
  }

  const email = pickText(row, ["cuenta_email", "email_cuenta", "email_cliente", "email"]);
  if (email) {
    const { data } = await client.from("cuentas").select("id").eq("email", email).is("deleted_at", null).maybeSingle();
    const id = (data as { id?: string } | null)?.id;
    if (id) return id;
  }

  const name = pickText(row, ["cuenta", "cliente", "colegio", "empresa", "centro", "nombre_cliente"]);
  if (!name) return null;
  const { data } = await client.from("cuentas").select("id").eq("nombre", name).is("deleted_at", null).maybeSingle();
  return ((data as { id?: string } | null)?.id) ?? null;
}

async function findContactId(client: Supabase, row: CriticalImportRow) {
  const explicitId = pickText(row, ["contacto_id", "contact_id"]);
  if (isUuid(explicitId)) {
    const { data } = await client.from("contactos").select("id").eq("id", explicitId).maybeSingle();
    return ((data as { id?: string } | null)?.id) ?? null;
  }

  const email = pickText(row, ["contacto_email", "email_contacto", "email"]);
  if (email) {
    const { data } = await client.from("contactos").select("id").eq("email", email).is("deleted_at", null).maybeSingle();
    const id = (data as { id?: string } | null)?.id;
    if (id) return id;
  }

  const phone = normalizePhone(pickText(row, ["telefono_contacto", "telefono", "whatsapp", "movil"]));
  if (!phone) return null;

  const { data: primary } = await client.from("contactos").select("id").eq("telefono", phone).is("deleted_at", null).maybeSingle();
  const primaryId = (primary as { id?: string } | null)?.id;
  if (primaryId) return primaryId;

  const { data: secondary } = await client
    .from("contactos")
    .select("id")
    .eq("telefono_alt", phone)
    .is("deleted_at", null)
    .maybeSingle();
  return ((secondary as { id?: string } | null)?.id) ?? null;
}

async function findContactAccountId(client: Supabase, contactId: string | null) {
  if (!contactId) return null;
  const { data } = await client.from("contactos").select("cuenta_id").eq("id", contactId).maybeSingle();
  return ((data as { cuenta_id?: string | null } | null)?.cuenta_id) ?? null;
}

async function findOrderId(client: Supabase, row: CriticalImportRow) {
  const explicitId = pickText(row, ["pedido_id", "order_id", "id_pedido"]);
  if (isUuid(explicitId)) {
    const { data } = await client.from("pedidos").select("id").eq("id", explicitId).maybeSingle();
    return ((data as { id?: string } | null)?.id) ?? null;
  }

  const reference = pickText(row, ["pedido_referencia", "referencia_pedido", "referencia", "pedido"]);
  if (!reference) return null;
  const { data } = await client.from("pedidos").select("id").eq("referencia", reference).maybeSingle();
  return ((data as { id?: string } | null)?.id) ?? null;
}

function rowSummary(row: CriticalImportRow, fallback: string) {
  return (
    pickText(row, ["resumen", "descripcion", "detalle", "concepto", "producto", "titulo", "nombre"]) ||
    fallback
  );
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const client = getRequiredDataClient();

  const [accounts, contacts, leads, orders, activities, ragAudit, counts] = await Promise.all([
    client
      .from("cuentas")
      .select("id,nombre,email,telefono,custom,created_at,updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(12),
    client
      .from("contactos")
      .select("id,cuenta_id,nombre_completo,rol,email,telefono,telefono_alt,canal_preferido,idioma_preferido,es_principal,fecha_ultima_interaccion")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(12),
    client
      .from("leads")
      .select("lead_id,canal,nombre_detectado,email_detectado,telefono_detectado,empresa_detectada,resumen,intent,urgencia,status,created_at,cuenta_id,contacto_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    client
      .from("pedidos")
      .select("id,cuenta_id,contacto_id,lead_id,referencia,estado,canal_origen,fecha_objetivo,total,moneda,notas,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(12),
    client
      .from("actividades")
      .select("actividad_id,tipo,direccion,asunto,descripcion,ai_resumen,ai_urgencia,categoria,fecha_hora,cuenta_id,contacto_id")
      .is("deleted_at", null)
      .order("fecha_hora", { ascending: false })
      .limit(16),
    fetchRagAudit(),
    Promise.all([
      countRows(client, "cuentas"),
      countRows(client, "contactos"),
      countRows(client, "contacto_metodos", false),
      countRows(client, "leads"),
      countRows(client, "pedidos", false),
      countRows(client, "actividades"),
      countRows(client, "documentos"),
    ]),
  ]);

  return {
    dataMode: "live",
    accounts: ((accounts.data ?? []) as Account[]),
    contacts: ((contacts.data ?? []) as Contact[]),
    leads: ((leads.data ?? []) as Lead[]),
    orders: ((orders.data ?? []) as Order[]),
    activities: ((activities.data ?? []) as Activity[]),
    ragAudit,
    counts: {
      accounts: counts[0],
      contacts: counts[1],
      contactMethods: counts[2],
      leads: counts[3],
      orders: counts[4],
      activities: counts[5],
      ragDocuments: counts[6],
    },
  };
}

export async function identifyContactByPhone(phone: string) {
  const client = getRequiredDataClient();
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data: method } = await client
    .from("contacto_metodos")
    .select("contacto_id,valor_norm,valor_raw,tipo")
    .in("tipo", ["whatsapp", "movil", "fijo"])
    .or(`valor_norm.eq.${normalized},valor_raw.eq.${normalized},valor_raw.eq.${phone}`)
    .limit(1)
    .maybeSingle();

  let contactId = (method as { contacto_id?: string } | null)?.contacto_id;

  if (!contactId) {
    const { data: fallback } = await client
      .from("contactos")
      .select("id")
      .or(`telefono.eq.${normalized},telefono_alt.eq.${normalized},telefono.eq.${phone},telefono_alt.eq.${phone}`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    contactId = (fallback as { id?: string } | null)?.id;
  }

  if (!contactId) return null;

  const { data: contact } = await client
    .from("contactos")
    .select("id,cuenta_id,nombre_completo,rol,email,telefono,telefono_alt,canal_preferido,idioma_preferido,es_principal,fecha_ultima_interaccion")
    .eq("id", contactId)
    .maybeSingle();

  const cuentaId = (contact as Contact | null)?.cuenta_id;
  const { data: account } = cuentaId
    ? await client.from("cuentas").select("id,nombre,email,telefono,custom,created_at,updated_at").eq("id", cuentaId).maybeSingle()
    : { data: null };

  return {
    contact: contact as Contact | null,
    account: account as Account | null,
  };
}

export async function saveWhatsappActivity(input: {
  phone: string;
  direction: "inbound" | "outbound";
  description: string;
  subject?: string;
  contactId?: string | null;
  accountId?: string | null;
  externalMessageId?: string | null;
  category?: string | null;
}) {
  const client = getRequiredDataClient();
  const activities = client.from("actividades") as unknown as LooseInsertTable;
  await activities.insert({
    tipo: "WhatsApp",
    direccion: input.direction,
    asunto: input.subject ?? "WhatsApp",
    descripcion: input.description,
    contacto_id: input.contactId ?? null,
    cuenta_id: input.accountId ?? null,
    channel_raw: input.phone,
    message_id_externo: input.externalMessageId ?? null,
    categoria: input.category ?? null,
    resultado: "Completada",
  });
}

export async function searchPublicRag(query: string, matchCount = 4) {
  const client = getRequiredDataClient();
  const embedding = await createEmbedding(query);
  if (!embedding) return [];
  const { data } = await (client as unknown as LooseRpcClient).rpc("match_documents_whatsapp", {
    query_embedding: embedding,
    match_count: matchCount,
    filter: { tipos: ["catalogo", "faq", "publicidad"] },
  });
  return (data ?? []) as Array<{ id: string; content: string; metadata: Record<string, unknown>; similarity: number }>;
}

export async function searchBotSafeKnowledge(query: string, matchCount = 3): Promise<BotSafeKnowledgeMatch[]> {
  const client = getRequiredDataClient();
  const embedding = await createEmbedding(query);
  if (!embedding) return [];
  const { data, error } = await (client as unknown as LooseRpcClient).rpc("match_bot_safe_knowledge", {
    query_embedding: embedding,
    match_count: matchCount,
    match_threshold: 0.45,
  });
  if (error) return [];
  return (data ?? []) as BotSafeKnowledgeMatch[];
}

export async function createCriticalImportBatch(input: {
  fileName: string;
  fileType?: string | null;
  uploadedBy?: string | null;
  rows: CriticalImportRow[];
}) {
  const client = getRequiredDataClient();
  const { data: batch, error } = await (client as unknown as LooseRpcClient).rpc("critical_import_create_batch", {
    p_file_name: input.fileName,
    p_file_type: input.fileType ?? null,
    p_uploaded_by: input.uploadedBy ?? null,
    p_rows: input.rows,
  });
  if (error) throw error;
  return batch;
}

export async function reviewCriticalImportBatch(input: {
  batchId: string;
  action: "approve" | "reject";
  reviewedBy?: string | null;
}): Promise<CriticalImportBatch> {
  const client = getRequiredDataClient();
  const { data, error } = await (client as unknown as LooseRpcClient).rpc("critical_import_review_batch", {
    p_batch_id: input.batchId,
    p_action: input.action,
    p_reviewed_by: input.reviewedBy ?? "crm",
  });
  if (error) throw error;
  return data as CriticalImportBatch;
}

async function fetchCriticalImportBatch(client: Supabase, batchId: string) {
  const { data, error } = await (client as unknown as LooseRpcClient).rpc("critical_import_get_batch", {
    p_batch_id: batchId,
  });
  if (error) throw error;
  return data as CriticalImportBatch;
}

async function fetchCriticalImportRows(client: Supabase, batchId: string) {
  const { data, error } = await (client as unknown as LooseRpcClient).rpc("critical_import_get_rows", {
    p_batch_id: batchId,
  });
  if (error) throw error;
  return (data ?? []) as CriticalImportRow[];
}

async function updateCriticalImportRowStatus(
  client: Supabase,
  rowId: string,
  value: {
    apply_status: "applied" | "skipped" | "failed";
    applied_to?: string | null;
    applied_record_id?: string | null;
    applied_at?: string | null;
    apply_error?: string | null;
  }
) {
  const { error } = await (client as unknown as LooseRpcClient).rpc("critical_import_update_row_status", {
    p_row_id: rowId,
    p_apply_status: value.apply_status,
    p_applied_to: value.applied_to ?? null,
    p_applied_record_id: value.applied_record_id ?? null,
    p_applied_at: value.applied_at ?? null,
    p_apply_error: value.apply_error ?? null,
  });
  if (error) throw error;
}

async function markBatchApplied(client: Supabase, batchId: string): Promise<CriticalImportBatch> {
  const { data, error } = await (client as unknown as LooseRpcClient).rpc("critical_import_mark_batch_applied", {
    p_batch_id: batchId,
  });
  if (error) throw error;
  return data as CriticalImportBatch;
}

async function insertPrivateVaultRow(client: Supabase, destination: string, payload: Record<string, unknown>) {
  const { data, error } = await (client as unknown as LooseRpcClient).rpc("critical_import_insert_private_vault", {
    p_destination: destination,
    p_payload: payload,
  });
  if (error) throw error;
  return String(data);
}

async function applyPedidoRow(client: Supabase, batch: CriticalImportBatch, row: CriticalImportRow): Promise<ImportApplyTarget> {
  const contactId = await findContactId(client, row);
  const accountId = (await findAccountId(client, row)) ?? (await findContactAccountId(client, contactId));
  const reference = pickText(row, ["referencia", "referencia_pedido", "pedido", "numero_pedido"]) || `IMP-${batch.id.slice(0, 8)}-${row.row_number}`;

  const payload = {
    cuenta_id: accountId,
    contacto_id: contactId,
    referencia: reference,
    estado: normalizeOrderStatus(row),
    canal_origen: normalizeOrderChannel(row),
    fecha_objetivo: pickDate(row, ["fecha_objetivo", "fecha_entrega", "fecha", "entrega"]),
    total: pickNumber(row, ["total", "importe", "importe_total", "presupuesto"]),
    moneda: normalizeCurrency(row),
    notas: pickText(row, ["notas", "observaciones", "comentarios"]),
    custom: publicImportProvenance(batch, row),
  };

  const pedidos = client.from("pedidos") as unknown as LooseSingleInsertTable;
  const { data, error } = await pedidos.insert(payload).select("id").single();
  if (error) throw error;
  return { status: "applied", table: "public.pedidos", recordId: String((data as { id: string }).id) };
}

async function applyPedidoLineaRow(client: Supabase, batch: CriticalImportBatch, row: CriticalImportRow): Promise<ImportApplyTarget> {
  const orderId = await findOrderId(client, row);
  if (!orderId) {
    return {
      status: "skipped",
      table: "public.pedido_lineas",
      reason: "No se encontro pedido_id ni referencia de pedido existente.",
    };
  }

  const concept = rowSummary(row, "");
  if (!concept) {
    return { status: "skipped", table: "public.pedido_lineas", reason: "La linea no tiene concepto o producto." };
  }

  const quantity = pickNumber(row, ["cantidad", "unidades", "qty"]) ?? 1;
  const unitPrice = pickNumber(row, ["precio_unitario", "precio", "tarifa"]);
  const total = pickNumber(row, ["total_linea", "total", "importe"]);
  const payload = {
    pedido_id: orderId,
    concepto: concept,
    cantidad: quantity,
    precio_unitario: unitPrice,
    total_linea: total ?? (unitPrice !== null ? unitPrice * quantity : null),
    observaciones: pickText(row, ["observaciones", "notas", "comentarios"]),
    atributos: publicImportProvenance(batch, row),
  };

  const lineas = client.from("pedido_lineas") as unknown as LooseSingleInsertTable;
  const { data, error } = await lineas.insert(payload).select("id").single();
  if (error) throw error;
  return { status: "applied", table: "public.pedido_lineas", recordId: String((data as { id: number | string }).id) };
}

async function applyTarifaPrivadaRow(
  client: Supabase,
  batch: CriticalImportBatch,
  row: CriticalImportRow,
  appliedBy?: string | null
): Promise<ImportApplyTarget> {
  if (!row.id) return { status: "skipped", table: "private.tarifas_privadas", reason: "Fila sin id de staging." };
  const contactId = await findContactId(client, row);
  const accountId = (await findAccountId(client, row)) ?? (await findContactAccountId(client, contactId));
  const recordId = await insertPrivateVaultRow(client, "tarifas_privadas", {
    batch_id: batch.id,
    row_id: row.id,
    cuenta_id: accountId,
    contacto_id: contactId,
    concepto: rowSummary(row, `Tarifa importada fila ${row.row_number}`),
    importe: pickNumber(row, ["importe", "precio", "tarifa", "total"]),
    moneda: normalizeCurrency(row),
    raw: row.raw,
    mapped: row.mapped,
    sensitivity: row.sensitivity,
    created_by: appliedBy ?? "crm",
  });
  return { status: "applied", table: "private.tarifas_privadas", recordId };
}

async function applyCondicionRow(
  client: Supabase,
  batch: CriticalImportBatch,
  row: CriticalImportRow,
  appliedBy?: string | null
): Promise<ImportApplyTarget> {
  if (!row.id) return { status: "skipped", table: "private.condiciones", reason: "Fila sin id de staging." };
  const contactId = await findContactId(client, row);
  const accountId = (await findAccountId(client, row)) ?? (await findContactAccountId(client, contactId));
  const recordId = await insertPrivateVaultRow(client, "condiciones", {
    batch_id: batch.id,
    row_id: row.id,
    cuenta_id: accountId,
    contacto_id: contactId,
    tipo: pickText(row, ["tipo", "tipo_condicion"]) || "condicion_comercial",
    resumen: rowSummary(row, `Condicion importada fila ${row.row_number}`),
    raw: row.raw,
    mapped: row.mapped,
    sensitivity: row.sensitivity,
    created_by: appliedBy ?? "crm",
  });
  return { status: "applied", table: "private.condiciones", recordId };
}

async function applyDocumentoPrivadoRow(
  client: Supabase,
  batch: CriticalImportBatch,
  row: CriticalImportRow,
  appliedBy?: string | null
): Promise<ImportApplyTarget> {
  if (!row.id) return { status: "skipped", table: "private.documentos_privados", reason: "Fila sin id de staging." };
  const recordId = await insertPrivateVaultRow(client, "documentos_privados", {
    batch_id: batch.id,
    row_id: row.id,
    titulo: rowSummary(row, `Documento privado importado fila ${row.row_number}`),
    fuente: pickText(row, ["fuente", "source", "archivo", "file"]),
    raw: row.raw,
    mapped: row.mapped,
    sensitivity: row.sensitivity,
    created_by: appliedBy ?? "crm",
  });
  return { status: "applied", table: "private.documentos_privados", recordId };
}

async function applyCriticalImportRow(
  client: Supabase,
  batch: CriticalImportBatch,
  row: CriticalImportRow,
  appliedBy?: string | null
): Promise<ImportApplyTarget> {
  if (row.apply_status === "applied") {
    return {
      status: "skipped",
      table: row.applied_to ?? undefined,
      reason: "Fila ya aplicada anteriormente.",
    };
  }

  switch (row.destination) {
    case "pedidos":
      return applyPedidoRow(client, batch, row);
    case "pedido_lineas":
      return applyPedidoLineaRow(client, batch, row);
    case "tarifas_privadas":
      return applyTarifaPrivadaRow(client, batch, row, appliedBy);
    case "condiciones":
      return applyCondicionRow(client, batch, row, appliedBy);
    case "documentos_privados":
      return applyDocumentoPrivadoRow(client, batch, row, appliedBy);
  }
}

export async function applyCriticalImportBatch(input: {
  batchId: string;
  appliedBy?: string | null;
}): Promise<CriticalImportApplyResult> {
  const client = getRequiredDataClient();
  const batch = await fetchCriticalImportBatch(client, input.batchId);
  if (batch.status !== "approved" && batch.status !== "applied") {
    throw new Error("El lote debe estar aprobado antes de aplicar datos finales.");
  }

  let applied = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];
  const rows = await fetchCriticalImportRows(client, input.batchId);

  for (const row of rows) {
    if (!row.id) {
      failed += 1;
      errors.push(`Fila ${row.row_number}: falta id de staging.`);
      continue;
    }

    try {
      const result = await applyCriticalImportRow(client, batch, row, input.appliedBy);
      const appliedAt = new Date().toISOString();
      if (result.status === "applied") {
        applied += 1;
        await updateCriticalImportRowStatus(client, row.id, {
          apply_status: "applied",
          applied_to: result.table,
          applied_record_id: result.recordId,
          applied_at: appliedAt,
          apply_error: null,
        });
      } else {
        skipped += 1;
        await updateCriticalImportRowStatus(client, row.id, {
          apply_status: "skipped",
          applied_to: result.table ?? null,
          applied_record_id: null,
          applied_at: appliedAt,
          apply_error: result.reason,
        });
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Error aplicando la fila.";
      errors.push(`Fila ${row.row_number}: ${message}`);
      await updateCriticalImportRowStatus(client, row.id, {
        apply_status: "failed",
        applied_to: row.destination,
        applied_record_id: null,
        applied_at: new Date().toISOString(),
        apply_error: message,
      });
    }
  }

  const refreshedRows = await fetchCriticalImportRows(client, input.batchId);
  const finalBatch = failed === 0 ? await markBatchApplied(client, input.batchId) : await fetchCriticalImportBatch(client, input.batchId);

  return {
    batch: finalBatch,
    applied,
    skipped,
    failed,
    rows: refreshedRows,
    errors,
  };
}
