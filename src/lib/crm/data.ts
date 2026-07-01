import { getDataAdminClient } from "@/lib/supabase-data";
import { createEmbedding } from "@/lib/crm/openai";
import { normalizePhone } from "@/lib/crm/security";
import type {
  Account,
  Activity,
  BotSafeKnowledgeMatch,
  Contact,
  CriticalImportBatch,
  CriticalImportStatus,
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

type LooseUpdateTable = {
  update: (value: unknown) => {
    eq: (column: string, value: unknown) => {
      eq: (column: string, value: unknown) => {
        select: (columns: string) => {
          single: () => Promise<{ data: unknown; error: Error | null }>;
        };
      };
    };
  };
};

type LoosePrivateSchema = {
  from: (table: string) => unknown;
};

type LooseSchemaClient = {
  schema: (schema: string) => LoosePrivateSchema;
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
  const privateSchema = (client as unknown as LooseSchemaClient).schema("private");

  const batches = privateSchema.from("critical_import_batches") as {
    insert: (value: unknown) => {
      select: (columns: string) => {
        single: () => Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
  const { data: batch, error } = await batches.insert({
      file_name: input.fileName,
      file_type: input.fileType ?? null,
      source: "crm_upload",
      status: "staged",
      uploaded_by: input.uploadedBy ?? null,
      row_count: input.rows.length,
    })
    .select("id,file_name,file_type,source,status,uploaded_by,approved_by,row_count,created_at,approved_at")
    .single();

  if (error) throw error;

  const batchId = (batch as { id: string }).id;
  if (input.rows.length) {
    const rowsTable = privateSchema.from("critical_import_rows") as LooseInsertTable;
    const { error: rowError } = await rowsTable.insert(
      input.rows.map((row) => ({
        batch_id: batchId,
        row_number: row.row_number,
        raw: row.raw,
        mapped: row.mapped,
        sensitivity: row.sensitivity,
        confidence: row.confidence,
        destination: row.destination,
        issues: row.issues,
      }))
    );
    if (rowError) throw rowError;
  }

  return batch;
}

export async function reviewCriticalImportBatch(input: {
  batchId: string;
  action: "approve" | "reject";
  reviewedBy?: string | null;
}): Promise<CriticalImportBatch> {
  const client = getRequiredDataClient();
  const privateSchema = (client as unknown as LooseSchemaClient).schema("private");
  const batches = privateSchema.from("critical_import_batches") as LooseUpdateTable;
  const status: CriticalImportStatus = input.action === "approve" ? "approved" : "rejected";

  const { data, error } = await batches
    .update({
      status,
      approved_by: input.reviewedBy ?? "crm",
      approved_at: new Date().toISOString(),
    })
    .eq("id", input.batchId)
    .eq("status", "staged")
    .select("id,file_name,file_type,source,status,uploaded_by,approved_by,row_count,created_at,approved_at")
    .single();

  if (error) throw error;
  return data as CriticalImportBatch;
}
