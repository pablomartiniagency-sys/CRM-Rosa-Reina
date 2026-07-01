"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModuleHeader } from "@/components/modules/Shared";

const WORKFLOWS = [
  { name: "WhatsApp principal", id: "MrB7ole5rzayU3MI", focus: "Canal activo a validar" },
  { name: "RAG Content Update", id: "W86DZM3VpnIwuIJU", focus: "Loader Drive -> rag_ingest" },
  { name: "Test WhatsApp", id: "VvTwVK13go5gaROw", focus: "Debe permanecer fuera de produccion" },
];

type IntegrationStatus = {
  ready: boolean;
  missing: string[];
  invalid: string[];
};

type HealthPayload = {
  integrations?: {
    supabase: IntegrationStatus;
    supabasePublic: IntegrationStatus;
    platformVault: IntegrationStatus;
    identity: IntegrationStatus;
    openAi: IntegrationStatus;
    whatsapp: IntegrationStatus;
    readiness: {
      crmViews: boolean;
      platformVault: boolean;
      identityLogin: boolean;
      ragAssistant: boolean;
      whatsappWebhook: boolean;
    };
  };
};

const INTEGRATION_LABELS = {
  supabasePublic: "Supabase CRM publico",
  supabase: "Supabase CRM admin",
  platformVault: "Supabase plataforma/vault",
  identity: "Identidad Rosa Reina",
  openAi: "OpenAI",
  whatsapp: "WhatsApp API",
} as const;

function ReadinessBadge({ ready }: { ready: boolean }) {
  return <Badge variant={ready ? "success" : "warning"}>{ready ? "Listo" : "Pendiente"}</Badge>;
}

function StatusLine({
  label,
  status,
}: {
  label: string;
  status?: IntegrationStatus;
}) {
  if (!status) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
        <div>
          <p className="text-sm font-semibold text-ink-900">{label}</p>
          <p className="mt-1 text-xs text-ink-400">Sin datos de diagnostico.</p>
        </div>
        <Badge variant="default">Sin datos</Badge>
      </div>
    );
  }

  const issues = [...status.missing.map((item) => `${item} falta`), ...status.invalid.map((item) => `${item} no es usable`)];

  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        <p className="mt-1 text-xs text-ink-400">{issues.length ? issues.join(" / ") : "Configuracion valida."}</p>
      </div>
      <ReadinessBadge ready={status.ready} />
    </div>
  );
}

export function ConfiguracionView() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as HealthPayload;
        if (!response.ok) throw new Error("No se pudo leer el estado del sistema");
        return payload;
      })
      .then((payload) => {
        if (active) setHealth(payload);
      })
      .catch((error) => {
        if (active) setHealthError(error instanceof Error ? error.message : "Error desconocido");
      });

    return () => {
      active = false;
    };
  }, []);

  const integrations = health?.integrations;

  return (
    <section>
      <ModuleHeader
        eyebrow="Sistema"
        title="Configuracion"
        description="Resumen de decisiones tecnicas para el CRM interno Rosa Reina y su automatizacion n8n + Supabase."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg lg:col-span-2">
          <CardHeader>
            <CardTitle>Preparacion para pruebas</CardTitle>
            <Badge variant={integrations?.readiness.crmViews ? "success" : "warning"}>
              {integrations?.readiness.crmViews ? "CRM operativo" : "Config incompleta"}
            </Badge>
          </CardHeader>
          {healthError ? (
            <p className="text-sm text-red-700">{healthError}</p>
          ) : (
            <div>
              <StatusLine label={INTEGRATION_LABELS.supabasePublic} status={integrations?.supabasePublic} />
              <StatusLine label={INTEGRATION_LABELS.supabase} status={integrations?.supabase} />
              <StatusLine label={INTEGRATION_LABELS.platformVault} status={integrations?.platformVault} />
              <StatusLine label={INTEGRATION_LABELS.identity} status={integrations?.identity} />
              <StatusLine label={INTEGRATION_LABELS.openAi} status={integrations?.openAi} />
              <StatusLine label={INTEGRATION_LABELS.whatsapp} status={integrations?.whatsapp} />
            </div>
          )}
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Principios activos</CardTitle>
            <Badge variant="info">V1</Badge>
          </CardHeader>
          <div className="space-y-3 text-sm text-ink-600">
            <p>1 base Supabase para Rosa Reina; no SaaS multiempresa en esta version.</p>
            <p>El CRM operativo y el vault de credenciales usan variables separadas.</p>
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
