import { NextResponse } from "next/server";
import { containsPricingOrOrderIntent } from "@/lib/crm/security";
import { searchBotSafeKnowledge } from "@/lib/crm/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
    if (containsPricingOrOrderIntent(query)) {
      return NextResponse.json({ matches: [], blocked: true, reason: "pricing_or_order_intent" });
    }
    const matches = await searchBotSafeKnowledge(query);
    return NextResponse.json({ matches, blocked: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to search bot-safe knowledge" },
      { status: 500 }
    );
  }
}
