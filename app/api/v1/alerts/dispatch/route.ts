import { NextRequest, NextResponse } from "next/server";
import { alertService } from "@/src/services/alert.service";
import type { AlertPayload, EscalationTarget, SeverityLevel } from "@/src/models/alert.model";

const VALID_SEVERITIES: SeverityLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];

function isValidEscalationTarget(value: unknown): value is EscalationTarget {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.role === "string" &&
    typeof t.contactChannel === "string" &&
    typeof t.contactAddress === "string"
  );
}

function parsePayload(body: unknown): AlertPayload | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.patientId !== "string" || b.patientId.trim().length === 0) {
    return { error: "`patientId` is required and must be a non-empty string" };
  }

  if (typeof b.category !== "string" || !VALID_SEVERITIES.includes(b.category as SeverityLevel)) {
    return { error: `\`category\` must be one of: ${VALID_SEVERITIES.join(", ")}` };
  }

  if (typeof b.riskScore !== "number" || !Number.isFinite(b.riskScore)) {
    return { error: "`riskScore` is required and must be a finite number" };
  }

  const payload: AlertPayload = {
    patientId: b.patientId,
    category: b.category as SeverityLevel,
    riskScore: b.riskScore,
    message: typeof b.message === "string" ? b.message : undefined,
    factors: Array.isArray(b.factors) ? (b.factors as AlertPayload["factors"]) : undefined,
    escalationTarget: isValidEscalationTarget(b.escalationTarget) ? b.escalationTarget : undefined,
    idempotencyKey: typeof b.idempotencyKey === "string" ? b.idempotencyKey : undefined,
  };

  return payload;
}

/**
 * POST /api/v1/alerts/dispatch
 * Triggers the alert dispatch pipeline for a risk evaluation
 * (typically forwarded directly from Module 4's
 * POST /api/v1/risk/evaluate response).
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const alert = await alertService.dispatch(parsed);
    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to dispatch alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
