import { NextResponse } from "next/server";
import { createSetupRagAudit, fetchRagAudit, isDataPlaneConfigurationError } from "@/lib/crm/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchRagAudit());
  } catch (error) {
    if (isDataPlaneConfigurationError(error)) {
      return NextResponse.json(createSetupRagAudit());
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load RAG audit" },
      { status: 500 }
    );
  }
}
