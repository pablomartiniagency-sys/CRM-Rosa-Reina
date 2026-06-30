export type Json = Record<string, unknown>;

export type LeadStatus = "nuevo" | "abierto" | "contactado" | "pendiente" | "ganado" | "perdido" | string;
export type OrderStatus = "nuevo" | "en_revision" | "pendiente_admin" | "preparacion" | "enviado" | "cerrado" | string;
export type ActivityDirection = "inbound" | "outbound" | "interno";
export type RagPublicType = "catalogo" | "faq" | "publicidad";
export type CriticalImportStatus = "staged" | "approved" | "rejected" | "applied";
export type DataMode = "live" | "setup";

export interface SetupIssue {
  code: string;
  message: string;
  variable?: string;
}

export interface Account {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  custom?: Json | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Contact {
  id: string;
  cuenta_id?: string | null;
  nombre_completo: string;
  rol?: string | null;
  email?: string | null;
  telefono?: string | null;
  telefono_alt?: string | null;
  canal_preferido?: string | null;
  idioma_preferido?: string | null;
  es_principal?: boolean | null;
  fecha_ultima_interaccion?: string | null;
}

export interface Activity {
  actividad_id: string;
  tipo: "Email" | "WhatsApp" | "Llamada" | "Reunion" | "Tarea" | "Nota" | "Otro" | string;
  direccion: ActivityDirection;
  asunto?: string | null;
  descripcion: string;
  ai_resumen?: string | null;
  ai_urgencia?: "low" | "medium" | "high" | null;
  categoria?: string | null;
  fecha_hora: string;
  cuenta_id?: string | null;
  contacto_id?: string | null;
}

export interface Lead {
  lead_id: string;
  canal: string;
  nombre_detectado?: string | null;
  email_detectado?: string | null;
  telefono_detectado?: string | null;
  empresa_detectada?: string | null;
  resumen: string;
  intent?: string | null;
  urgencia?: "low" | "medium" | "high" | string | null;
  status: LeadStatus;
  created_at: string;
  cuenta_id?: string | null;
  contacto_id?: string | null;
}

export interface Order {
  id: string;
  cuenta_id?: string | null;
  contacto_id?: string | null;
  lead_id?: string | null;
  referencia?: string | null;
  estado: OrderStatus;
  canal_origen?: string | null;
  fecha_objetivo?: string | null;
  total?: number | null;
  moneda?: string | null;
  notas?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RagDocument {
  documento_id: string;
  tipo: RagPublicType | "historico" | "otro";
  titulo: string;
  fuente?: string | null;
  metadata?: Json | null;
  created_at?: string | null;
  updated_at?: string | null;
  chunks?: number;
  dims?: number | null;
}

export interface RagAudit {
  liveDocuments: RagDocument[];
  publicChunks: number;
  sensitiveRecoverableChunks: number;
  orphanChunks: number;
  privateBotSafeChunks: number;
  dataMode?: DataMode;
  setupIssues?: SetupIssue[];
}

export interface BotSafeKnowledgeMatch {
  chunk_id: string;
  document_id: string;
  title: string;
  content: string;
  similarity: number;
  metadata: Json;
}

export interface CriticalImportRow {
  id?: string;
  row_number: number;
  raw: Json;
  mapped: Json;
  sensitivity: "low" | "medium" | "high";
  confidence: number;
  destination: "pedidos" | "pedido_lineas" | "tarifas_privadas" | "condiciones" | "documentos_privados";
  issues: string[];
}

export interface CriticalImportBatch {
  id: string;
  file_name: string;
  file_type?: string | null;
  source: "crm_upload" | "drive_private" | "manual";
  status: CriticalImportStatus;
  uploaded_by?: string | null;
  approved_by?: string | null;
  row_count: number;
  created_at: string;
  approved_at?: string | null;
}

export interface DashboardSnapshot {
  dataMode?: DataMode;
  setupIssues?: SetupIssue[];
  accounts: Account[];
  contacts: Contact[];
  leads: Lead[];
  orders: Order[];
  activities: Activity[];
  ragAudit: RagAudit;
  counts: {
    accounts: number;
    contacts: number;
    contactMethods: number;
    leads: number;
    orders: number;
    activities: number;
    ragDocuments: number;
  };
}
