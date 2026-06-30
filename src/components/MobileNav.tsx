"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  IconChat,
  IconClipboard,
  IconDashboard,
  IconInvoice,
  IconSettings,
  IconUsers,
} from "@/components/ui/Icons";

const ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: <IconDashboard width={20} height={20} /> },
  { href: "/clientes", label: "Clientes", icon: <IconUsers width={20} height={20} /> },
  { href: "/pedidos", label: "Pedidos", icon: <IconInvoice width={20} height={20} /> },
  { href: "/whatsapp", label: "WhatsApp", icon: <IconChat width={20} height={20} /> },
  { href: "/rag", label: "RAG", icon: <IconClipboard width={20} height={20} /> },
  { href: "/configuracion", label: "Mas", icon: <IconSettings width={20} height={20} /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:hidden">
      <div className="grid h-16 grid-cols-6 px-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium ${
                active ? "text-rose-700" : "text-ink-400"
              }`}
            >
              <span>{item.icon}</span>
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
