"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock, MetricCard, ModuleHeader, SetupNotice } from "@/components/modules/Shared";
import type { RagAudit } from "@/types/crm";

export function RagView() {
  const [audit, setAudit] = useState<RagAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rag/audit", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudo auditar RAG");
        return body as RagAudit;
      })
      .then(setAudit)
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock />;
  if (error || !audit) return <ErrorBlock message={error ?? "Sin datos"} />;

  const safe = audit.sensitiveRecoverableChunks === 0 && audit.orphanChunks === 0;
  const setupMode = audit.dataMode === "setup";

  return (
    <section>
      <ModuleHeader
        eyebrow="Conocimiento"
        title="RAG seguro"
        description="Separacion entre RAG publico, vault privado, allowlist bot_safe y datos criticos estructurados."
      />

      {setupMode ? <SetupNotice issues={audit.setupIssues} /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Docs publicos" value={audit.liveDocuments.length} note="Documentos vivos" />
        <MetricCard label="Chunks publicos" value={audit.publicChunks} note="Catalogo, FAQ y publicidad" />
        <MetricCard label="Chunks sensibles" value={audit.sensitiveRecoverableChunks} note="Debe ser 0" />
        <MetricCard label="Bot safe" value={audit.privateBotSafeChunks} note="Privado aprobado para bot" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Documentos RAG publico</CardTitle>
            <Badge variant={safe ? "success" : "danger"}>{safe ? "Sin fugas" : "Revisar"}</Badge>
          </CardHeader>
          <div className="space-y-3">
            {audit.liveDocuments.length ? (
              audit.liveDocuments.map((doc) => (
                <div key={doc.documento_id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-ink-900">{doc.titulo}</p>
                    <Badge variant="info">{doc.tipo}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {doc.chunks ?? 0} chunks - {doc.fuente ?? "sin fuente"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-ink-500">
                {setupMode ? "La auditoria RAG real aparecera aqui al conectar Supabase admin." : "No hay documentos RAG publicos."}
              </p>
            )}
          </div>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Capas de acceso</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm text-ink-600">
            <p><strong>Publico:</strong> recuperable por WhatsApp y email.</p>
            <p><strong>Privado interno:</strong> solo equipo autorizado.</p>
            <p><strong>bot_safe:</strong> privado redactado, aprobado y marcado para el bot.</p>
            <p><strong>Critico:</strong> tarifas, pedidos, contratos y condiciones en tablas privadas.</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
