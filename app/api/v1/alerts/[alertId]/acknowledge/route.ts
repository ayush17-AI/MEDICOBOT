import { NextRequest, NextResponse } from "next/server";
import { alertService } from "@/src/services/alert.service";

/**
 * POST /api/v1/alerts/:alertId/acknowledge
 * Body: { acknowledgedBy: string }
 * Doctor/caregiver sends an acknowledgement token, halting escalation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty/absent body is fine — fall back to an "unknown" acknowledger below.
  }

  const acknowledgedBy =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).acknowledgedBy === "string"
      ? ((body as Record<string, unknown>).acknowledgedBy as string)
      : "unknown";

  const alert = await alertService.acknowledge(alertId, acknowledgedBy);

  if (!alert) {
    return NextResponse.json(
      { error: `No alert found with id "${alertId}"` },
      { status: 404 }
    );
  }

  return NextResponse.json(alert, { status: 200 });
}
