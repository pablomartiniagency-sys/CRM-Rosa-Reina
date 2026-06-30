import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const VARIANTS: Record<string, string> = {
  default: "bg-gray-100 text-ink-500 border-gray-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("chip", VARIANTS[variant], className)}>
      {children}
    </span>
  );
}
