/**
 * Module 4: Personalized Recommendation & Risk Scoring Engine
 * Domain models / type contracts.
 *
 * These types are intentionally decoupled from any transport layer
 * (Next.js route handlers) so the scoring logic in risk.service.ts
 * stays a pure, framework-agnostic engine.
 */

/** Raw vitals + symptoms as submitted for a single evaluation. All fields optional
 *  so a partial payload never crashes the engine (missing fields => 0 impact). */
export interface VitalsInput {
  spo2?: number;
  heartRate?: number;
  systolicBP?: number;
  temperature?: number;
  symptoms?: string[];
  symptomsText?: string;
}

export interface RiskEvaluationRequest {
  patientId: string;
  vitals: VitalsInput;
}

export type RiskTier = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

/** A single explainable contribution to the total risk score. */
export interface RiskFactor {
  parameter: "SpO2" | "HeartRate" | "SystolicBP" | "Temperature" | "Symptom";
  impact: number;
  reason: string;
}

export interface RiskEvaluationResult {
  patientId: string;
  riskScore: number;
  category: RiskTier;
  factors: RiskFactor[];
  evaluatedAt: string; // ISO timestamp
}

/** Persisted / queryable state for a patient sitting in the triage queue. */
export interface TriageQueueItem {
  patientId: string;
  riskScore: number;
  category: RiskTier;
  compositeTriageIndex: number;
  factors: RiskFactor[];
  vitals: VitalsInput;
  enqueuedAt: string; // ISO timestamp — first time this patient was evaluated
  lastEvaluatedAt: string; // ISO timestamp — most recent evaluation
}
