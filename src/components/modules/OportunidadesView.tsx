"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock, ModuleHeader, SetupNotice, StatusBadge } from "@/components/modules/Shared";
import { useCrmOverview } from "@/components/modules/useCrmOverview";

export function OportunidadesView() {
  const { data, error, loading } = useCrmOverview();
  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Sin datos"} />;
  const setupMode = data.dataMode === "setup";

  return (
    <section>
      <ModuleHeader
        eyebrow="Ventas"
        title="Oportunidades"
        description="Leads de WhatsApp, email y formularios. Aqui se separa informacion comercial segura de solicitudes que deben pasar a administracion."
      />
      {setupMode ? <SetupNotice issues={data.setupIssues} /> : null}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Pipeline reciente</CardTitle>
        </CardHeader>
        {data.leads.length ? (
          <div className="space-y-3">
            {data.leads.map((lead) => (
              <div key={lead.lead_id} className="rounded-lg border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-ink-900">{lead.empresa_detectada || lead.nombre_detectado || "Lead sin nombre"}</p>
                    <p className="break-words text-sm text-ink-500">{lead.canal} - {lead.intent ?? "consulta"}</p>
                    {lead.telefono_detectado ? <p className="break-words text-xs text-ink-400">{lead.telefono_detectado}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={lead.urgencia ?? "medium"} />
                    <StatusBadge value={lead.status} />
                  </div>
                </div>
                <p className="mt-3 break-words text-sm text-ink-600">{lead.resumen}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-ink-500">
            {setupMode ? "Las oportunidades reales apareceran aqui al conectar Supabase admin." : "No hay oportunidades pendientes."}
          </p>
        )}
      </Card>
    </section>
  );
}
