import { NextResponse } from "next/server";
import { RiskService } from "@/src/services/risk.service";
import { triageQueueStore } from "@/src/store/triage.store";

/**
 * GET /api/v1/triage/queue
 * Returns every patient currently in the triage queue, sorted by
 * compositeTriageIndex descending (highest priority first). Aging
 * weight is recomputed against "now" on every read so the ordering
 * reflects live wait time, not a stale snapshot.
 */
export async function GET() {
  const now = new Date();

  const queue = triageQueueStore
    .getAll()
    .map((item) => RiskService.refreshCompositeIndex(item, now))
    .sort((a, b) => b.compositeTriageIndex - a.compositeTriageIndex);

  return NextResponse.json({ queue, count: queue.length }, { status: 200 });
}
