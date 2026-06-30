import { NextResponse } from "next/server";
import {
  createSetupDashboardSnapshot,
  fetchDashboardSnapshot,
  isDataPlaneConfigurationError,
} from "@/lib/crm/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await fetchDashboardSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    if (isDataPlaneConfigurationError(error)) {
      return NextResponse.json(createSetupDashboardSnapshot());
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load CRM overview" },
      { status: 500 }
    );
  }
}
