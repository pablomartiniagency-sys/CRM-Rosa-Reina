"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModuleHeader } from "@/components/modules/Shared";

type Message = { role: "user" | "assistant"; content: string };

export function AsistenteView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Listo. Puedo consultar RAG publico y conocimiento bot_safe. Si aparece precio, pedido o plazo, derivo.",
    },
  ]);
  const [input, setInput] = useState("Que tipos de babis haceis?");
  const [loading, setLoading] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const body = (await response.json()) as { answer?: string; error?: string; derived?: boolean };
    setLoading(false);
    setMessages((current) => [
      ...current,
      { role: "assistant", content: body.answer ?? body.error ?? "No se pudo responder" },
    ]);
  }

  return (
    <section>
      <ModuleHeader
        eyebrow="IA"
        title="Asistente interno"
        description="Sandbox para probar respuestas con RAG seguro antes de afinar el flujo de WhatsApp."
      />
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Conversacion</CardTitle>
          <Badge variant="success">Sin precios publicos</Badge>
        </CardHeader>
        <div className="mb-4 max-h-[480px] space-y-3 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto bg-rose-700 text-white"
                  : "bg-white text-ink-700 ring-1 ring-gray-100"
              }`}
            >
              {message.content}
            </div>
          ))}
          {loading ? <div className="rounded-lg bg-white px-3 py-2 text-sm text-ink-400 ring-1 ring-gray-100">Pensando...</div> : null}
        </div>
        <form onSubmit={send} className="flex gap-2">
          <input className="input flex-1" value={input} onChange={(event) => setInput(event.target.value)} />
          <button className="btn-primary shrink-0 disabled:opacity-50" disabled={loading} type="submit">
            Enviar
          </button>
        </form>
      </Card>
    </section>
  );
}
