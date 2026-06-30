import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface KPIProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function KPI({ label, value, subtitle, icon, trend, className }: KPIProps) {
  return (
    <div className={cn("card p-4", className)}>
      <div className="mb-2 flex items-start justify-between">
        <div className="label">{label}</div>
        {icon ? <div className="text-rose-500/70">{icon}</div> : null}
      </div>
      <div className="text-2xl font-bold tracking-tight text-ink-900">{value}</div>
      {subtitle ? (
        <div className="mt-1 flex items-center gap-1.5">
          {trend === "up" ? <span className="text-xs text-emerald-600">up</span> : null}
          {trend === "down" ? <span className="text-xs text-red-600">down</span> : null}
          <span className="text-xs text-ink-400">{subtitle}</span>
        </div>
      ) : null}
    </div>
  );
}
