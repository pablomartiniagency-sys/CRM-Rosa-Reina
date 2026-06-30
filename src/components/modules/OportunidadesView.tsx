"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyBlock, ErrorBlock, LoadingBlock, ModuleHeader, StatusBadge } from "@/components/modules/Shared";
import { useCrmOverview } from "@/components/modules/useCrmOverview";

export function OportunidadesView() {
  const { data, error, loading } = useCrmOverview();
  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Sin datos"} />;

  return (
    <section>
      <ModuleHeader
        eyebrow="Ventas"
        title="Oportunidades"
        description="Leads de WhatsApp, email y formularios. Aqui se separa informacion comercial segura de solicitudes que deben pasar a administracion."
      />
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Pipeline reciente</CardTitle>
        </CardHeader>
        {data.leads.length ? (
          <div className="space-y-3">
            {data.leads.map((lead) => (
              <div key={lead.lead_id} className="rounded-lg border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{lead.empresa_detectada || lead.nombre_detectado || "Lead sin nombre"}</p>
                    <p className="text-sm text-ink-500">{lead.canal} - {lead.intent ?? "consulta"}</p>
                  </div>
                  <StatusBadge value={lead.status} />
                </div>
                <p className="mt-3 text-sm text-ink-600">{lead.resumen}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock>No hay oportunidades pendientes.</EmptyBlock>
        )}
      </Card>
    </section>
  );
}
