import { NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/crm/openai";
import { searchBotSafeKnowledge, searchPublicRag } from "@/lib/crm/data";
import { containsPricingOrOrderIntent, safePublicReplyForSensitiveIntent } from "@/lib/crm/security";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = [
  "Eres el asistente interno de CRM Rosa Reina.",
  "Rosa Reina fabrica uniformes infantiles y ayuda a escuelas con marca, imagen corporativa y marketing educativo.",
  "Regla absoluta: nunca des precios, rangos, descuentos, importes, plazos comprometidos ni condiciones comerciales.",
  "Si el usuario pide precio, presupuesto, pedido, cantidades para cotizar o plazo, responde empezando por [DERIVAR].",
  "Puedes usar RAG publico y conocimiento privado solo si esta marcado como bot_safe.",
  "No reveles datos de otros clientes ni documentos internos.",
].join("\n");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string; contactName?: string };
    const message = body.message?.trim();
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

    if (containsPricingOrOrderIntent(message)) {
      return NextResponse.json({
        answer: safePublicReplyForSensitiveIntent(body.contactName),
        sources: [],
        derived: true,
      });
    }

    const [publicMatches, botSafeMatches] = await Promise.all([
      searchPublicRag(message).catch(() => []),
      searchBotSafeKnowledge(message).catch(() => []),
    ]);

    const context = [
      publicMatches.length ? "RAG publico:\n" + publicMatches.map((m) => `- ${m.content}`).join("\n") : "",
      botSafeMatches.length ? "Privado aprobado bot_safe:\n" + botSafeMatches.map((m) => `- ${m.content}`).join("\n") : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await createChatCompletion(
      SYSTEM_PROMPT,
      `${context ? `Contexto disponible:\n${context}\n\n` : ""}Consulta: ${message}`
    );

    const fallback = context
      ? `Puedo responder con la informacion segura disponible: ${context.slice(0, 900)}`
      : "No tengo contexto suficiente en el RAG seguro para responder con precision. Te recomiendo derivarlo al equipo de administracion.";

    return NextResponse.json({
      answer: completion ?? fallback,
      sources: [
        ...publicMatches.map((m) => ({ type: "public_rag", metadata: m.metadata, similarity: m.similarity })),
        ...botSafeMatches.map((m) => ({ type: "bot_safe", title: m.title, similarity: m.similarity })),
      ],
      derived: (completion ?? fallback).startsWith("[DERIVAR]"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assistant request failed" },
      { status: 500 }
    );
  }
}
