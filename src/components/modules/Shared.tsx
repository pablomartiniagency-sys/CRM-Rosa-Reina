import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

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
      <p className="label">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="mt-1 text-xs text-ink-400">{note}</p>
    </Card>
  );
}
