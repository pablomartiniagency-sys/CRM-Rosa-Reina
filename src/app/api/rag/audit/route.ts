import { NextResponse } from "next/server";
import { fetchRagAudit } from "@/lib/crm/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchRagAudit());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load RAG audit" },
      { status: 500 }
    );
  }
}
