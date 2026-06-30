"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock, MetricCard, ModuleHeader, SetupNotice } from "@/components/modules/Shared";
import { useCrmOverview } from "@/components/modules/useCrmOverview";

const CHECKS = [
  "Identificacion por telefono normalizado",
  "Contexto CRM limitado al contacto y su cuenta",
  "RAG publico: catalogo, FAQ y publicidad segura",
  "RAG privado: solo chunks aprobados como bot_safe",
  "Precios, presupuestos, pedidos y plazos: [DERIVAR]",
  "Interacciones guardadas en actividades",
];

export function WhatsappView() {
  const { data, error, loading } = useCrmOverview();
  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Sin datos"} />;

  const whatsappActivities = data.activities.filter((activity) => activity.tipo === "WhatsApp");
  const setupMode = data.dataMode === "setup";

  return (
    <section>
      <ModuleHeader
        eyebrow="Canal prioritario"
        title="WhatsApp seguro"
        description="Panel de control del flujo Meta Cloud API. Telegram queda fuera de foco; WhatsApp se apoya en CRM, RAG publico y allowlist bot_safe."
      />

      {setupMode ? <SetupNotice issues={data.setupIssues} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Actividades WhatsApp" value={whatsappActivities.length} note="Ultimas interacciones visibles" />
        <MetricCard label="Contactos" value={data.counts.contacts} note="Base para identificar clientes" />
        <MetricCard label="Metodos contacto" value={data.counts.contactMethods} note="Telefonos, emails y WhatsApp" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Contrato del bot</CardTitle>
            <Badge variant="success">Activo en codigo</Badge>
          </CardHeader>
          <div className="space-y-3">
            {CHECKS.map((check) => (
              <div key={check} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 text-sm text-ink-600">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                <span>{check}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Ultimos mensajes</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {whatsappActivities.length ? (
              whatsappActivities.slice(0, 8).map((activity) => (
                <div key={activity.actividad_id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-900">{activity.direccion}</p>
                    <span className="text-xs text-ink-400">{new Date(activity.fecha_hora).toLocaleString("es-ES")}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">{activity.descripcion}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-ink-500">
                {setupMode ? "Los mensajes reales apareceran aqui al conectar Supabase admin." : "No hay mensajes WhatsApp recientes en la ventana consultada."}
              </p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
