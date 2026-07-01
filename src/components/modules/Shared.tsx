import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { SetupIssue } from "@/types/crm";

export function ModuleHeader({
  title,
  eyebrow,
  description,
}: {
  title: string;
  eyebrow: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">{description}</p>
    </header>
  );
}

export function LoadingBlock() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-lg bg-white ring-1 ring-gray-100" />
      <div className="h-64 rounded-lg bg-white ring-1 ring-gray-100" />
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <p className="text-sm font-semibold text-red-800">No se pudo cargar esta vista</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
    </Card>
  );
}

export function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed text-center text-sm text-ink-500">
      <div className="py-8">{children}</div>
    </Card>
  );
}

export function SetupNotice({
  title = "Conecta Supabase admin para ver datos reales",
  issues = [],
}: {
  title?: string;
  issues?: SetupIssue[];
}) {
  return (
    <Card className="mb-6 rounded-lg border-amber-200 bg-amber-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          <p className="mt-1 max-w-3xl text-sm text-amber-800">
            El CRM esta en modo configuracion pendiente. La estructura ya es navegable y cambiara a datos reales al
            anadir la clave de servidor.
          </p>
          {issues.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {issues.map((issue) => (
                <span key={issue.code} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  {issue.variable ?? issue.code}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <Badge variant="warning">Setup</Badge>
      </div>
    </Card>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  const normalized = (value ?? "pendiente").toLowerCase();
  const variant = normalized.includes("high") || normalized.includes("urgente")
    ? "danger"
    : normalized.includes("pend") || normalized.includes("revision")
      ? "warning"
      : normalized.includes("ganado") || normalized.includes("ok") || normalized.includes("complet")
        ? "success"
        : "default";
  return <Badge variant={variant}>{value ?? "pendiente"}</Badge>;
}

export function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <Card className="rounded-lg">
      <p className="label break-words">{label}</p>
      <p className="mt-2 break-words text-3xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="mt-1 break-words text-xs text-ink-400">{note}</p>
    </Card>
  );
}
