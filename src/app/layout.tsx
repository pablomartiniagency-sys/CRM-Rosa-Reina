import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Rosa Reina",
  description: "CRM interno para clientes, WhatsApp, RAG seguro e importacion critica de Rosa Reina.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fgqlgehbtjdwcilyroiq.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-foreground antialiased font-sans">
        <ToastProvider>
          <Providers>{children}</Providers>
        </ToastProvider>
      </body>
    </html>
  );
}
