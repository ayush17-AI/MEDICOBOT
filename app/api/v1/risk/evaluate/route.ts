import { NextRequest, NextResponse } from "next/server";
import { RiskService } from "@/src/services/risk.service";
import { triageQueueStore } from "@/src/store/triage.store";
import type {
  RiskEvaluationRequest,
  RiskEvaluationResult,
  TriageQueueItem,
  VitalsInput,
} from "@/src/models/risk.model";

function isValidBody(body: unknown): body is RiskEvaluationRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.patientId === "string" && b.patientId.trim().length > 0;
}

function sanitizeVitals(raw: unknown): VitalsInput {
  if (typeof raw !== "object" || raw === null) return {};
  const v = raw as Record<string, unknown>;

  const toFiniteNumber = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  return {
    spo2: toFiniteNumber(v.spo2),
    heartRate: toFiniteNumber(v.heartRate),
    systolicBP: toFiniteNumber(v.systolicBP),
    temperature: toFiniteNumber(v.temperature),
    symptoms: Array.isArray(v.symptoms)
      ? v.symptoms.filter((s): s is string => typeof s === "string")
      : typeof v.symptoms === "string"
      ? [v.symptoms]
      : undefined,
    symptomsText: typeof v.symptomsText === "string" ? v.symptomsText : undefined,
  };
}

/**
 * POST /api/v1/risk/evaluate
 * Body: { patientId: string, vitals: VitalsInput }
 * Scores the payload, upserts the patient into the in-memory triage
 * queue, and returns the risk evaluation result.
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "Request must include a non-empty string `patientId`" },
      { status: 400 }
    );
  }

  const vitals = sanitizeVitals(body.vitals);
  const { riskScore, factors } = RiskService.evaluate(vitals);
  const category = RiskService.categorize(riskScore);
  const now = new Date();
  const nowIso = now.toISOString();

  const existing = triageQueueStore.getByPatientId(body.patientId);
  const enqueuedAt = existing?.enqueuedAt ?? nowIso;

  const compositeTriageIndex = RiskService.computeCompositeTriageIndex(
    riskScore,
    category,
    enqueuedAt,
    now
  );

  const queueItem: TriageQueueItem = {
    patientId: body.patientId,
    riskScore,
    category,
    compositeTriageIndex,
    factors,
    vitals,
    enqueuedAt,
    lastEvaluatedAt: nowIso,
  };

  triageQueueStore.upsert(queueItem);

  const result = {
    patientId: body.patientId,
    riskScore,
    category,
    riskTier: category,
    compositeTriageIndex,
    factors,
    riskFactors: factors,
    evaluatedAt: nowIso,
  };

  return NextResponse.json(result, { status: 200 });
}
