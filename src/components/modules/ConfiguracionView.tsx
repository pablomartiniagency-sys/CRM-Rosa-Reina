"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModuleHeader } from "@/components/modules/Shared";

const WORKFLOWS = [
  { name: "WhatsApp principal", id: "MrB7ole5rzayU3MI", focus: "Canal activo a validar" },
  { name: "RAG Content Update", id: "W86DZM3VpnIwuIJU", focus: "Loader Drive -> rag_ingest" },
  { name: "Test WhatsApp", id: "VvTwVK13go5gaROw", focus: "Debe permanecer fuera de produccion" },
];

export function ConfiguracionView() {
  return (
    <section>
      <ModuleHeader
        eyebrow="Sistema"
        title="Configuracion"
        description="Resumen de decisiones tecnicas para el CRM interno Rosa Reina y su automatizacion n8n + Supabase."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Principios activos</CardTitle>
            <Badge variant="info">V1</Badge>
          </CardHeader>
          <div className="space-y-3 text-sm text-ink-600">
            <p>1 base Supabase para Rosa Reina; no SaaS multiempresa en esta version.</p>
            <p>WhatsApp y RAG son prioridad. Telegram queda fuera de alcance.</p>
            <p>Datos criticos en tablas privadas con staging y auditoria.</p>
            <p>RAG privado solo llega al bot si esta aprobado como bot_safe.</p>
          </div>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>n8n</CardTitle>
            <Badge variant="warning">Verificar live</Badge>
          </CardHeader>
          <div className="space-y-3">
            {WORKFLOWS.map((workflow) => (
              <div key={workflow.id} className="rounded-lg border border-gray-100 p-3">
                <p className="font-semibold text-ink-900">{workflow.name}</p>
                <p className="text-xs text-ink-400">{workflow.id}</p>
                <p className="mt-1 text-sm text-ink-500">{workflow.focus}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
