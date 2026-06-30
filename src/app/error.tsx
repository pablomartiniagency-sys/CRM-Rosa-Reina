"use client";

import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(0,0%,98%)] p-6">
      <div className="max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-ink-900">Algo salio mal</h1>
        <p className="mb-6 text-sm text-ink-500">Ha ocurrido un error inesperado.</p>
        <Button onClick={reset}>Intentar de nuevo</Button>
      </div>
    </div>
  );
}
