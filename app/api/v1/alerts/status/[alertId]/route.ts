import { NextRequest, NextResponse } from "next/server";
import { alertService } from "@/src/services/alert.service";

/**
 * GET /api/v1/alerts/status/:alertId
 * Returns the live dispatch state (per-channel status + full timeline)
 * for a single alert.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params;
  const alert = alertService.getStatus(alertId);

  if (!alert) {
    return NextResponse.json(
      { error: `No alert found with id "${alertId}"` },
      { status: 404 }
    );
  }

  return NextResponse.json(alert, { status: 200 });
}
