"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModuleHeader, StatusBadge } from "@/components/modules/Shared";
import type { CriticalImportApplyResult, CriticalImportBatch, CriticalImportRow, CriticalImportStatus } from "@/types/crm";

type ImportResponse = {
  batch?: CriticalImportBatch;
  rows?: CriticalImportRow[];
  error?: string;
};

type ReviewResponse = {
  batch?: CriticalImportBatch;
  status?: CriticalImportStatus;
  applyResult?: CriticalImportApplyResult;
  error?: string;
};

export function ImportarView() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CriticalImportRow[]>([]);
  const [batch, setBatch] = useState<CriticalImportBatch | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState<"approve" | "reject" | "apply" | null>(null);
  const [applyResult, setApplyResult] = useState<CriticalImportApplyResult | null>(null);

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
    setBatch(body.batch ?? null);
    setApplyResult(null);
  }

  async function review(action: "approve" | "reject" | "apply") {
    if (!batch) return;
    setReviewLoading(action);
    setError("");
    const response = await fetch("/api/imports/critical", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: batch.id, action, reviewedBy: "crm", appliedBy: "crm" }),
    });
    const body = (await response.json()) as ReviewResponse;
    setReviewLoading(null);
    if (!response.ok || !body.batch) {
      setError(body.error ?? "No se pudo revisar el lote");
      return;
    }
    setBatch(body.batch);
    if (body.applyResult) {
      setApplyResult(body.applyResult);
      setRows(body.applyResult.rows);
    }
  }

  const canReview = batch?.status === "staged";
  const canApply = batch?.status === "approved";
  const reviewMessage =
    batch?.status === "approved"
      ? "Staging aprobado. Ya puedes aplicar el lote a tablas finales."
      : batch?.status === "rejected"
        ? "Staging rechazado. Queda solo como auditoria privada."
        : batch?.status === "applied"
          ? "Lote aplicado con trazabilidad por fila."
        : batch
          ? "Pendiente de aprobacion humana."
          : "";

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
          {batch ? (
            <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink-900">Lote {batch.id}</p>
                <Badge
                  variant={
                    batch.status === "approved"
                      ? "success"
                      : batch.status === "rejected"
                        ? "danger"
                        : batch.status === "applied"
                          ? "info"
                          : "warning"
                  }
                >
                  {batch.status}
                </Badge>
              </div>
              <p className="text-xs text-ink-500">{reviewMessage}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-primary disabled:opacity-50"
                  disabled={!canReview || reviewLoading !== null}
                  onClick={() => review("approve")}
                  type="button"
                >
                  {reviewLoading === "approve" ? "Aprobando..." : "Aprobar"}
                </button>
                <button
                  className="btn-secondary border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={!canReview || reviewLoading !== null}
                  onClick={() => review("reject")}
                  type="button"
                >
                  {reviewLoading === "reject" ? "Rechazando..." : "Rechazar"}
                </button>
              </div>
              {canApply ? (
                <button
                  className="btn-primary w-full disabled:opacity-50"
                  disabled={reviewLoading !== null}
                  onClick={() => review("apply")}
                  type="button"
                >
                  {reviewLoading === "apply" ? "Aplicando..." : "Aplicar finales"}
                </button>
              ) : null}
              {applyResult ? (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <p className="font-bold">{applyResult.applied}</p>
                    <p>aplicadas</p>
                  </div>
                  <div className="rounded-lg bg-gray-100 p-2 text-ink-500">
                    <p className="font-bold">{applyResult.skipped}</p>
                    <p>omitidas</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2 text-red-700">
                    <p className="font-bold">{applyResult.failed}</p>
                    <p>fallidas</p>
                  </div>
                </div>
              ) : null}
            </div>
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
                {row.apply_status && row.apply_status !== "pending" ? (
                  <p className="mt-2 break-words text-xs text-ink-500">
                    {row.apply_status}
                    {row.applied_to ? ` -> ${row.applied_to}` : ""}
                    {row.apply_error ? `: ${row.apply_error}` : ""}
                  </p>
                ) : null}
              </div>
            ))}
            {!rows.length ? <p className="py-8 text-center text-sm text-ink-500">Sube un archivo para generar el staging.</p> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
