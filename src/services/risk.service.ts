import type {
  RiskFactor,
  RiskTier,
  TriageQueueItem,
  VitalsInput,
} from "@/src/models/risk.model";

/**
 * Pure, side-effect-free clinical risk scoring engine.
 *
 * Formula: Total Risk Score = (Vitals Score * 0.4) + (Symptom LLM Score * 0.6)
 * Strictly bounded [0, 100].
 */

/**
 * Evaluates Vitals Score (0 - 100)
 * Normal vitals contribute 0 score.
 */
export function calculateVitalsScore(vitals: VitalsInput): number {
  let score = 0;

  if (vitals.spo2 && vitals.spo2 < 90) score += 40;
  else if (vitals.spo2 && vitals.spo2 < 95) score += 20;

  if (vitals.heartRate && (vitals.heartRate > 120 || vitals.heartRate < 50)) score += 30;
  else if (vitals.heartRate && (vitals.heartRate > 100 || vitals.heartRate < 60)) score += 15;

  if (vitals.systolicBP && (vitals.systolicBP > 140 || vitals.systolicBP < 85)) score += 30;

  if (vitals.temperature && vitals.temperature > 102) score += 15;

  return Math.min(100, score);
}

/**
 * Combines Vitals Score + LLM Evaluated Symptom Score
 * Formula: (Vitals Score * 0.4) + (Symptom LLM Score * 0.6)
 * Bounded [0, 100]
 */
export function calculateFinalRiskScore(vitalsScore: number, llmSymptomScore: number): number {
  const finalScore = Math.round((vitalsScore * 0.4) + (llmSymptomScore * 0.6));
  return Math.max(0, Math.min(100, finalScore));
}

const QUEUE_AGING_POINTS_PER_10_MIN = 2.5;
const QUEUE_AGING_CAP = 25;
const CRITICAL_COMPOSITE_OVERRIDE = 999.0;
const CRITICAL_RISK_THRESHOLD = 76;

export class RiskService {
  /**
   * Evaluates vitals and optional LLM symptom score into a combined 0-100 risk score.
   */
  static evaluate(
    vitals: VitalsInput,
    symptomLlmScore?: number
  ): {
    riskScore: number;
    factors: RiskFactor[];
  } {
    const factors: RiskFactor[] = [];
    const vScore = calculateVitalsScore(vitals);

    if (vitals.spo2 && vitals.spo2 < 90) {
      factors.push({ parameter: "SpO2", impact: 40, reason: `Critical Hypoxia (SpO2 ${vitals.spo2}%)` });
    } else if (vitals.spo2 && vitals.spo2 < 95) {
      factors.push({ parameter: "SpO2", impact: 20, reason: `Moderate Hypoxia (SpO2 ${vitals.spo2}%)` });
    }

    if (vitals.heartRate && (vitals.heartRate > 120 || vitals.heartRate < 50)) {
      factors.push({ parameter: "HeartRate", impact: 30, reason: `Severe Dysrhythmia / Tachycardia (HR ${vitals.heartRate} BPM)` });
    } else if (vitals.heartRate && (vitals.heartRate > 100 || vitals.heartRate < 60)) {
      factors.push({ parameter: "HeartRate", impact: 15, reason: `Mild Bradycardia / Tachycardia (HR ${vitals.heartRate} BPM)` });
    }

    if (vitals.systolicBP && (vitals.systolicBP > 140 || vitals.systolicBP < 85)) {
      factors.push({ parameter: "SystolicBP", impact: 30, reason: `Elevated/Low Blood Pressure (SBP ${vitals.systolicBP} mmHg)` });
    }

    if (vitals.temperature && vitals.temperature > 102) {
      factors.push({ parameter: "Temperature", impact: 15, reason: `High Fever (${vitals.temperature}°F)` });
    }

    // Default symptom score if not provided directly
    const sScore = typeof symptomLlmScore === "number" ? symptomLlmScore : 0;
    if (sScore > 0) {
      factors.push({
        parameter: "Symptom",
        impact: Math.round(sScore * 0.6),
        reason: `LLM Clinical Symptom Rating (${sScore}/100)`,
      });
    }

    const finalScore = calculateFinalRiskScore(vScore, sScore);

    return { riskScore: finalScore, factors };
  }

  /** Maps a bounded 0-100 score to its clinical tier. */
  static categorize(riskScore: number): RiskTier {
    if (riskScore >= 76) return "CRITICAL";
    if (riskScore >= 51) return "HIGH";
    if (riskScore >= 26) return "MODERATE";
    return "LOW";
  }

  /** Composite Triage Index = (riskScore * 0.75) + queueAgingWeight, override 999.0 for CRITICAL */
  static computeCompositeTriageIndex(
    riskScore: number,
    category: RiskTier,
    enqueuedAt: string,
    now: Date = new Date()
  ): number {
    if (category === "CRITICAL" || riskScore >= CRITICAL_RISK_THRESHOLD) {
      return CRITICAL_COMPOSITE_OVERRIDE;
    }

    const agingWeight = RiskService.computeQueueAgingWeight(enqueuedAt, now);
    return riskScore * 0.75 + agingWeight;
  }

  /** +2.5 points per 10 minutes waited, capped at 25 points. */
  static computeQueueAgingWeight(enqueuedAt: string, now: Date = new Date()): number {
    const enqueuedTime = new Date(enqueuedAt).getTime();
    const nowTime = now.getTime();

    if (Number.isNaN(enqueuedTime) || nowTime <= enqueuedTime) {
      return 0;
    }

    const minutesWaited = (nowTime - enqueuedTime) / 60000;
    const weight = (minutesWaited / 10) * QUEUE_AGING_POINTS_PER_10_MIN;
    return Math.min(QUEUE_AGING_CAP, weight);
  }

  static refreshCompositeIndex(item: TriageQueueItem, now: Date = new Date()): TriageQueueItem {
    return {
      ...item,
      compositeTriageIndex: RiskService.computeCompositeTriageIndex(
        item.riskScore,
        item.category,
        item.enqueuedAt,
        now
      ),
    };
  }
}
