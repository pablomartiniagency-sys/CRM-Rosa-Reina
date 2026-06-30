"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) router.replace("/dashboard");
    else setError(result.error ?? "No se pudo iniciar sesion");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[hsl(0,0%,98%)] p-4">
      <section className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <Logo href="/login" />
          <p className="mt-4 text-sm text-ink-500">
            Acceso interno para validar clientes, WhatsApp, RAG seguro e importaciones criticas.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-500">Email</span>
            <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-500">Password</span>
            <input
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
          <button className="btn-primary w-full disabled:opacity-50" disabled={submitting} type="submit">
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
