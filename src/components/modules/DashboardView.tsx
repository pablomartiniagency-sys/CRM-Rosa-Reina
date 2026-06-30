"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock, MetricCard, ModuleHeader, StatusBadge } from "@/components/modules/Shared";
import { useCrmOverview } from "@/components/modules/useCrmOverview";

export function DashboardView() {
  const { data, error, loading } = useCrmOverview();

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Sin datos"} />;

  const ragOk = data.ragAudit.sensitiveRecoverableChunks === 0 && data.ragAudit.orphanChunks === 0;

  return (
    <section>
      <ModuleHeader
        eyebrow="Rosa Reina"
        title="Centro de control"
        description="Vista interna para clientes, oportunidades, pedidos, WhatsApp y RAG seguro. Los precios y datos criticos se tratan como informacion privada y derivable."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Clientes" value={data.counts.accounts} note="Cuentas de escuelas y empresas" />
        <MetricCard label="Contactos" value={data.counts.contacts} note={`${data.counts.contactMethods} metodos normalizados`} />
        <MetricCard label="Leads" value={data.counts.leads} note="Consultas y oportunidades abiertas" />
        <MetricCard label="RAG publico" value={data.ragAudit.publicChunks} note={ragOk ? "Sin fugas detectadas" : "Revisar auditoria"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <Badge variant="info">WhatsApp y email</Badge>
          </CardHeader>
          <div className="space-y-3">
            {data.activities.slice(0, 8).map((activity) => (
              <div key={activity.actividad_id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-ink-900">{activity.asunto ?? activity.tipo}</p>
                  <StatusBadge value={activity.ai_urgencia ?? activity.direccion} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                  {activity.ai_resumen || activity.descripcion}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Guardrails activos</CardTitle>
            <Badge variant={ragOk ? "success" : "danger"}>{ragOk ? "OK" : "Riesgo"}</Badge>
          </CardHeader>
          <div className="space-y-3 text-sm text-ink-600">
            <p>WhatsApp no debe comunicar precios, tarifas, descuentos, condiciones ni plazos comprometidos.</p>
            <p>El RAG publico solo recupera catalogo, FAQ y publicidad segura.</p>
            <p>El conocimiento privado solo llega al bot si esta aprobado como bot_safe.</p>
            <p>Importaciones criticas entran primero en staging y requieren aprobacion humana.</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
