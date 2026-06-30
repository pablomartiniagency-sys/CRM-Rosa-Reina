import type { CriticalImportRow, Json } from "@/types/crm";

export const DERIVE_MARKER = "[DERIVAR]";

const PRICE_OR_QUOTE_RE =
  /\b(precio|precios|tarifa|tarifas|presupuesto|presupuestar|cotizar|cotizacion|coste|importe|descuento|pedido|plazo|entrega|comprar|unidades|cantidad)\b/i;

const HARD_SECRET_RE =
  /(iban|nif|dni|contrato|factura|margen|descuento|tarifa|precio|total|importe|condicion especial|pedido)/i;

export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("34") && digits.length === 11) return `+${digits}`;
  if (digits.length === 9) return `+34${digits}`;
  return `+${digits}`;
}

export function containsPricingOrOrderIntent(text: string): boolean {
  return PRICE_OR_QUOTE_RE.test(text);
}

export function containsHardSecret(text: string): boolean {
  return HARD_SECRET_RE.test(text);
}

export function safePublicReplyForSensitiveIntent(contactName?: string | null): string {
  const greeting = contactName ? `Hola ${contactName}. ` : "Hola. ";
  return `${DERIVE_MARKER} ${greeting}Para precios, presupuestos, pedidos, cantidades o plazos necesitamos revisar el caso con administracion, porque cada proyecto se personaliza. Te paso con el equipo para que lo miren con detalle.`;
}

export function classifyCriticalRow(rowNumber: number, raw: Json): CriticalImportRow {
  const serialized = JSON.stringify(raw);
  const keys = Object.keys(raw).join(" ");
  const hasPrice = /(precio|tarifa|importe|total|descuento|iva|margen)/i.test(keys + serialized);
  const hasOrder = /(pedido|referencia|cantidad|linea|producto|fecha)/i.test(keys + serialized);
  const hasContract = /(contrato|condicion|iban|nif|dni|factura)/i.test(keys + serialized);

  const destination: CriticalImportRow["destination"] = hasPrice
    ? "tarifas_privadas"
    : hasContract
      ? "condiciones"
      : hasOrder
        ? "pedidos"
        : "documentos_privados";

  const sensitivity: CriticalImportRow["sensitivity"] = hasPrice || hasContract ? "high" : hasOrder ? "medium" : "low";
  const issues = [
    hasPrice ? "Contiene campos economicos: no debe entrar en RAG publico." : "",
    hasContract ? "Contiene datos contractuales o identificadores sensibles." : "",
  ].filter(Boolean);

  return {
    row_number: rowNumber,
    raw,
    mapped: raw,
    sensitivity,
    confidence: hasPrice || hasOrder || hasContract ? 0.82 : 0.55,
    destination,
    issues,
  };
}
