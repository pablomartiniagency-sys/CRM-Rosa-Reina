"use client";

import { cn } from "@/lib/cn";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full max-w-lg rounded-2xl bg-white border border-gray-200 p-6 shadow-xl animate-fadeIn", className)}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-900 text-xl leading-none">&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
