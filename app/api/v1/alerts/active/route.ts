import { NextResponse } from "next/server";
import { alertService } from "@/src/services/alert.service";

/**
 * GET /api/v1/alerts/active
 * Returns every alert that is not yet ACKNOWLEDGED and did not
 * permanently FAIL — i.e. everything still pending, sent, delivered,
 * or escalated across the system.
 */
export async function GET() {
  const active = alertService.getActive();
  return NextResponse.json({ alerts: active, count: active.length }, { status: 200 });
}
