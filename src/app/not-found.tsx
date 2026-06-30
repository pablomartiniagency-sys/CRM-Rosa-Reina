import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(0,0%,98%)] p-6">
      <div className="max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        <h1 className="mb-2 text-6xl font-extrabold text-ink-900">404</h1>
        <p className="mb-6 text-sm text-ink-500">Esta pagina no existe o fue movida.</p>
        <Link href="/dashboard" className="btn-primary">
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
