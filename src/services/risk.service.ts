import type {
  RiskFactor,
  RiskTier,
  TriageQueueItem,
  VitalsInput,
} from "@/src/models/risk.model";

/** Critical symptom keywords, matched case-insensitively as substrings
 *  against each entry of `vitals.symptoms`. Each keyword can only
 *  contribute once per evaluation, regardless of how many symptom
 *  strings mention it. */
const HIGH_RISK_SYMPTOM_KEYWORDS = [
  "chest pain",
  "shortness of breath",
  "unresponsive",
  "stroke symptoms",
  "severe bleeding",
] as const;

const SYMPTOM_POINTS = 20;
const QUEUE_AGING_POINTS_PER_10_MIN = 2.5;
const QUEUE_AGING_CAP = 25;
const CRITICAL_COMPOSITE_OVERRIDE = 999.0;
const CRITICAL_RISK_THRESHOLD = 76;

/**
 * Pure, side-effect-free clinical risk scoring engine.
 * No I/O, no framework dependencies — safe to unit test directly.
 */
export class RiskService {
  /**
   * Scores a vitals/symptoms payload against weighted clinical
   * parameters and returns the bounded 0-100 score plus an
   * explainability trail. Missing/undefined fields are skipped
   * (0 impact) rather than throwing.
   */
  static evaluate(vitals: VitalsInput): {
    riskScore: number;
    factors: RiskFactor[];
  } {
    const factors: RiskFactor[] = [];

    RiskService.scoreSpo2(vitals.spo2, factors);
    RiskService.scoreHeartRate(vitals.heartRate, factors);
    RiskService.scoreSystolicBP(vitals.systolicBP, factors);
    RiskService.scoreSymptoms(vitals.symptoms, factors);

    const totalScore = factors.reduce((sum, f) => sum + f.impact, 0);
    const riskScore = Math.min(100, Math.max(0, totalScore));

    return { riskScore, factors };
  }

  /** Maps a bounded 0-100 score to its clinical tier. */
  static categorize(riskScore: number): RiskTier {
    if (riskScore >= 76) return "CRITICAL";
    if (riskScore >= 51) return "HIGH";
    if (riskScore >= 26) return "MODERATE";
    return "LOW";
  }

  /**
   * Composite Triage Index = (riskScore * 0.75) + queueAgingWeight,
   * with a hard override to 999.0 for CRITICAL patients (or any
   * riskScore >= 76) so they always sort to the front of the queue,
   * bypassing normal wait-time math entirely.
   */
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

  /** Recomputes the composite index for a live queue item using the
   *  current time — used by the queue GET endpoint so aging is always
   *  fresh, not just what it was at insert time. */
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

  private static scoreSpo2(spo2: number | undefined, factors: RiskFactor[]): void {
    if (spo2 === undefined || spo2 === null || Number.isNaN(spo2)) return;

    if (spo2 < 88) {
      factors.push({
        parameter: "SpO2",
        impact: 50,
        reason: `Critical hypoxia detected (SpO2 ${spo2}% < 88%)`,
      });
    } else if (spo2 < 93) {
      factors.push({
        parameter: "SpO2",
        impact: 25,
        reason: `Moderate hypoxia detected (SpO2 ${spo2}% is between 88% and 93%)`,
      });
    }
  }

  private static scoreHeartRate(hr: number | undefined, factors: RiskFactor[]): void {
    if (hr === undefined || hr === null || Number.isNaN(hr)) return;

    if (hr > 130 || hr < 40) {
      factors.push({
        parameter: "HeartRate",
        impact: 30,
        reason: `Severe dysrhythmia detected (HR ${hr} bpm outside 40-130 range)`,
      });
    } else if ((hr > 100 && hr <= 130) || (hr >= 40 && hr < 50)) {
      factors.push({
        parameter: "HeartRate",
        impact: 15,
        reason: `Abnormal heart rate detected (HR ${hr} bpm)`,
      });
    }
  }

  private static scoreSystolicBP(sbp: number | undefined, factors: RiskFactor[]): void {
    if (sbp === undefined || sbp === null || Number.isNaN(sbp)) return;

    if (sbp >= 180 || sbp <= 80) {
      factors.push({
        parameter: "SystolicBP",
        impact: 35,
        reason: `Hypertensive crisis or severe hypotension detected (SBP ${sbp} mmHg)`,
      });
    } else if ((sbp >= 140 && sbp < 180) || (sbp > 80 && sbp < 90)) {
      factors.push({
        parameter: "SystolicBP",
        impact: 15,
        reason: `Elevated or low systolic blood pressure detected (SBP ${sbp} mmHg)`,
      });
    }
  }

  private static scoreSymptoms(symptoms: string[] | undefined, factors: RiskFactor[]): void {
    if (!symptoms || symptoms.length === 0) return;

    const normalized = symptoms.map((s) => s.toLowerCase());

    for (const keyword of HIGH_RISK_SYMPTOM_KEYWORDS) {
      const matched = normalized.some((s) => s.includes(keyword));
      if (matched) {
        factors.push({
          parameter: "Symptom",
          impact: SYMPTOM_POINTS,
          reason: `High-risk symptom keyword matched: "${keyword}"`,
        });
      }
    }
  }
}
