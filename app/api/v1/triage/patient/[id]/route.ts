import { NextRequest, NextResponse } from "next/server";
import { RiskService } from "@/src/services/risk.service";
import { triageQueueStore } from "@/src/store/triage.store";

/**
 * GET /api/v1/triage/patient/:id
 * Returns the current triage standing for a single patient, including
 * a freshly recomputed composite triage index.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const item = triageQueueStore.getByPatientId(id);

  if (!item) {
    return NextResponse.json(
      { error: `No triage record found for patient "${id}"` },
      { status: 404 }
    );
  }

  const refreshed = RiskService.refreshCompositeIndex(item, new Date());
  return NextResponse.json(refreshed, { status: 200 });
}
