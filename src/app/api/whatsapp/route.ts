import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  identifyContactByPhone,
  saveWhatsappActivity,
  searchBotSafeKnowledge,
  searchPublicRag,
} from "@/lib/crm/data";
import {
  containsPricingOrOrderIntent,
  DERIVE_MARKER,
  safePublicReplyForSensitiveIntent,
} from "@/lib/crm/security";

export const dynamic = "force-dynamic";

type MetaMessage = {
  from: string;
  id?: string;
  timestamp?: string;
  text?: { body?: string };
  type?: string;
};

function extractMessages(payload: unknown): MetaMessage[] {
  const root = payload as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: MetaMessage[] } }> }>;
  };
  return root.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []) ?? [];
}

async function sendWhatsAppText(to: string, text: string) {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
    return { dryRun: true, to, text };
  }
  const response = await fetch(`https://graph.facebook.com/v21.0/${env.whatsappPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text.replace(DERIVE_MARKER, "").trim() },
    }),
  });
  if (!response.ok) throw new Error(`Meta send failed: ${response.status}`);
  return response.json();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === env.whatsappVerifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const messages = extractMessages(payload);

    const results = await Promise.all(
      messages.map(async (message) => {
        const body = message.text?.body?.trim() ?? "";
        if (!body) return { id: message.id, skipped: true, reason: "non_text_message" };

        const identity = await identifyContactByPhone(message.from).catch(() => null);
        const contactName = identity?.contact?.nombre_completo;

        await saveWhatsappActivity({
          phone: message.from,
          direction: "inbound",
          description: body,
          contactId: identity?.contact?.id,
          accountId: identity?.account?.id,
          externalMessageId: message.id,
          category: "whatsapp_inbound",
        }).catch(() => undefined);

        let answer = "";
        let derived = false;

        if (containsPricingOrOrderIntent(body)) {
          answer = safePublicReplyForSensitiveIntent(contactName);
          derived = true;
        } else {
          const [publicMatches, botSafeMatches] = await Promise.all([
            searchPublicRag(body, 3).catch(() => []),
            searchBotSafeKnowledge(body, 2).catch(() => []),
          ]);
          const snippets = [
            ...publicMatches.map((m) => m.content),
            ...botSafeMatches.map((m) => m.content),
          ].filter(Boolean);
          answer = snippets.length
            ? `Hola${contactName ? ` ${contactName}` : ""}. ${snippets[0].slice(0, 700)}`
            : `Hola${contactName ? ` ${contactName}` : ""}. Te podemos ayudar con uniformes infantiles, babis, complementos, marca e imagen para escuelas. Si necesitas precio, presupuesto o pedido, te paso con administracion.`;
        }

        await saveWhatsappActivity({
          phone: message.from,
          direction: "outbound",
          description: answer,
          contactId: identity?.contact?.id,
          accountId: identity?.account?.id,
          externalMessageId: message.id ? `${message.id}:reply` : null,
          category: derived ? "derivacion_admin" : "whatsapp_reply",
        }).catch(() => undefined);

        const sendResult = await sendWhatsAppText(message.from, answer);
        return { id: message.id, derived, sendResult };
      })
    );

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "WhatsApp webhook failed" },
      { status: 500 }
    );
  }
}
