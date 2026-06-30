"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none",
        variant === "primary" && "bg-lapis-500 text-white hover:bg-lapis-600 shadow-sm shadow-lapis-500/20",
        variant === "secondary" && "bg-white border border-gray-200 text-ink-700 hover:bg-gray-50 hover:border-gray-300",
        variant === "ghost" && "text-ink-500 hover:text-ink-900 hover:bg-gray-100",
        variant === "danger" && "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
