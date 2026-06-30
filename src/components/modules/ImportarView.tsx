"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModuleHeader, StatusBadge } from "@/components/modules/Shared";
import type { CriticalImportRow } from "@/types/crm";

type ImportResponse = {
  batch?: { id: string; file_name: string; status: string; row_count: number };
  rows?: CriticalImportRow[];
  error?: string;
};

export function ImportarView() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CriticalImportRow[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const highSensitivity = useMemo(() => rows.filter((row) => row.sensitivity === "high").length, [rows]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("uploadedBy", "crm");
    const response = await fetch("/api/imports/critical", { method: "POST", body: formData });
    const body = (await response.json()) as ImportResponse;
    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo procesar el archivo");
      return;
    }
    setRows(body.rows ?? []);
    setBatchId(body.batch?.id ?? null);
  }

  return (
    <section>
      <ModuleHeader
        eyebrow="Datos criticos"
        title="Importacion con staging"
        description="Los Excel, CSV o PDF estructurados se extraen primero a una tabla de revision. Nada debe aplicarse a pedidos, tarifas o condiciones hasta que un humano apruebe."
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Subir archivo</CardTitle>
            <Badge variant="warning">No RAG publico</Badge>
          </CardHeader>
          <form onSubmit={submit} className="space-y-4">
            <input
              className="block w-full rounded-lg border border-gray-200 bg-white p-3 text-sm"
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
            <button className="btn-primary w-full disabled:opacity-50" disabled={!file || loading} type="submit">
              {loading ? "Procesando..." : "Crear staging"}
            </button>
          </form>
          {batchId ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Lote creado: {batchId}. Pendiente de aprobacion humana.
            </p>
          ) : null}
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Previsualizacion</CardTitle>
            <StatusBadge value={rows.length ? `${rows.length} filas` : "sin staging"} />
          </CardHeader>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-ink-400">Filas</p>
              <p className="text-2xl font-bold">{rows.length}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Alta sensibilidad</p>
              <p className="text-2xl font-bold text-amber-900">{highSensitivity}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <p className="text-xs text-rose-700">Aplicacion final</p>
              <p className="text-sm font-semibold text-rose-900">Requiere aprobar</p>
            </div>
          </div>
          <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {rows.slice(0, 20).map((row) => (
              <div key={row.row_number} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">Fila {row.row_number}</p>
                  <div className="flex gap-2">
                    <Badge variant={row.sensitivity === "high" ? "danger" : row.sensitivity === "medium" ? "warning" : "default"}>
                      {row.sensitivity}
                    </Badge>
                    <Badge variant="info">{row.destination}</Badge>
                  </div>
                </div>
                {row.issues.length ? <p className="mt-2 text-xs text-amber-700">{row.issues.join(" ")}</p> : null}
              </div>
            ))}
            {!rows.length ? <p className="py-8 text-center text-sm text-ink-500">Sube un archivo para generar el staging.</p> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
