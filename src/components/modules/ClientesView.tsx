"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock, ModuleHeader, SetupNotice } from "@/components/modules/Shared";
import { useCrmOverview } from "@/components/modules/useCrmOverview";

export function ClientesView() {
  const { data, error, loading } = useCrmOverview();
  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Sin datos"} />;
  const setupMode = data.dataMode === "setup";

  return (
    <section>
      <ModuleHeader
        eyebrow="CRM"
        title="Clientes y contactos"
        description="Escuelas, centros infantiles y empresas con sus contactos utiles para WhatsApp, email e historial comercial."
      />

      {setupMode ? <SetupNotice issues={data.setupIssues} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Ultimas cuentas</CardTitle>
          </CardHeader>
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Telefono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.accounts.length ? (
                  data.accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-3 py-3 font-medium text-ink-900">{account.nombre}</td>
                      <td className="px-3 py-3 text-ink-500">{account.email ?? "-"}</td>
                      <td className="px-3 py-3 text-ink-500">{account.telefono ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-6 text-sm text-ink-500" colSpan={3}>
                      {setupMode ? "Las cuentas reales apareceran aqui al conectar Supabase admin." : "No hay cuentas sincronizadas."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Contactos recientes</CardTitle>
          </CardHeader>
          {data.contacts.length ? (
            <div className="space-y-3">
              {data.contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="font-semibold text-ink-900">{contact.nombre_completo}</p>
                  <p className="text-sm text-ink-500">{contact.rol ?? "Contacto"} - {contact.canal_preferido ?? "whatsapp"}</p>
                  <p className="mt-1 text-xs text-ink-400">{contact.email ?? contact.telefono ?? "Sin metodo visible"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-ink-500">
              {setupMode ? "Los contactos reales apareceran aqui al conectar Supabase admin." : "No hay contactos sincronizados."}
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
