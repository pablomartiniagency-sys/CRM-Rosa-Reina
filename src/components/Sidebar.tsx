"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Logo } from "@/components/ui/Logo";
import {
  IconChat,
  IconClipboard,
  IconDashboard,
  IconHelp,
  IconInvoice,
  IconLogout,
  IconSettings,
  IconTrendingUp,
  IconUpload,
  IconUsers,
} from "@/components/ui/Icons";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/clientes", label: "Clientes", icon: <IconUsers /> },
  { href: "/oportunidades", label: "Oportunidades", icon: <IconTrendingUp /> },
  { href: "/pedidos", label: "Pedidos", icon: <IconInvoice /> },
  { href: "/whatsapp", label: "WhatsApp", icon: <IconChat /> },
  { href: "/rag", label: "RAG seguro", icon: <IconClipboard /> },
  { href: "/importar", label: "Importar", icon: <IconUpload /> },
  { href: "/asistente", label: "Asistente", icon: <IconHelp /> },
  { href: "/configuracion", label: "Configuracion", icon: <IconSettings /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6 lg:flex">
      <div className="px-2 pb-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  : "text-ink-500 hover:bg-gray-50 hover:text-ink-900"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="mt-6 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-400 hover:bg-gray-50 hover:text-ink-900"
      >
        <IconLogout width={14} height={14} />
        Cerrar sesion
      </button>
    </aside>
  );
}
