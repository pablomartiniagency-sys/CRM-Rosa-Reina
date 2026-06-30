"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock, ModuleHeader, SetupNotice, StatusBadge } from "@/components/modules/Shared";
import { useCrmOverview } from "@/components/modules/useCrmOverview";

export function PedidosView() {
  const { data, error, loading } = useCrmOverview();
  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Sin datos"} />;
  const setupMode = data.dataMode === "setup";

  return (
    <section>
      <ModuleHeader
        eyebrow="Operaciones"
        title="Pedidos y solicitudes"
        description="Seguimiento interno de referencias, estados y canal origen. Los importes quedan como dato privado y no se usan en respuestas publicas."
      />

      {setupMode ? <SetupNotice issues={data.setupIssues} /> : null}

      <Card className="mb-6 rounded-lg border-amber-200 bg-amber-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-900">Politica comercial</p>
            <p className="mt-1 text-sm text-amber-800">
              Si una conversacion toca precio, presupuesto, pedido o plazo, WhatsApp debe derivar a administracion.
            </p>
          </div>
          <Badge variant="warning">Derivar</Badge>
        </div>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Pedidos recientes</CardTitle>
        </CardHeader>
        {data.orders.length ? (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-3 py-2">Referencia</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha objetivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-3 font-medium text-ink-900">{order.referencia ?? order.id.slice(0, 8)}</td>
                    <td className="px-3 py-3 text-ink-500">{order.canal_origen ?? "-"}</td>
                    <td className="px-3 py-3"><StatusBadge value={order.estado} /></td>
                    <td className="px-3 py-3 text-ink-500">{order.fecha_objetivo ?? "Sin compromiso publico"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-ink-500">
            {setupMode ? "Los pedidos reales apareceran aqui al conectar Supabase admin." : "Aun no hay pedidos estructurados."}
          </p>
        )}
      </Card>
    </section>
  );
}
