import { describe, expect, it } from "vitest";
import { RiskService, calculateVitalsScore, calculateFinalRiskScore } from "@/src/services/risk.service";

describe("RiskService & Mathematical Risk Scoring Engine", () => {
  it("calculates vitals score correctly for normal & abnormal vitals", () => {
    expect(calculateVitalsScore({})).toBe(0);
    expect(calculateVitalsScore({ spo2: 98, heartRate: 72, systolicBP: 120, temperature: 98.6 })).toBe(0);
    expect(calculateVitalsScore({ spo2: 85 })).toBe(40);
    expect(calculateVitalsScore({ spo2: 93 })).toBe(20);
    expect(calculateVitalsScore({ heartRate: 130 })).toBe(30);
    expect(calculateVitalsScore({ heartRate: 45 })).toBe(30);
    expect(calculateVitalsScore({ systolicBP: 150 })).toBe(30);
    expect(calculateVitalsScore({ temperature: 103 })).toBe(15);
  });

  it("calculates final risk score using weighted formula (vitals * 0.4 + llm * 0.6)", () => {
    // Normal vitals (0) + LLM score (100) => 0*0.4 + 100*0.6 = 60
    expect(calculateFinalRiskScore(0, 100)).toBe(60);

    // Vitals score (100) + LLM score (100) => 100*0.4 + 100*0.6 = 100
    expect(calculateFinalRiskScore(100, 100)).toBe(100);

    // Vitals score (50) + LLM score (50) => 50*0.4 + 50*0.6 = 50
    expect(calculateFinalRiskScore(50, 50)).toBe(50);
  });

  it("evaluates risk score with RiskService.evaluate", () => {
    const { riskScore, factors } = RiskService.evaluate({ spo2: 85 }, 100);
    // Vitals score = 40. LLM score = 100. Final = 40*0.4 + 100*0.6 = 16 + 60 = 76
    expect(riskScore).toBe(76);
    expect(factors).toHaveLength(2);
    expect(factors[0]).toMatchObject({ parameter: "SpO2", impact: 40 });
  });

  it("handles partial/missing vitals without throwing", () => {
    expect(() => RiskService.evaluate({ heartRate: undefined })).not.toThrow();
  });
});

describe("RiskService.categorize", () => {
  it.each([
    [0, "LOW"],
    [25, "LOW"],
    [26, "MODERATE"],
    [50, "MODERATE"],
    [51, "HIGH"],
    [75, "HIGH"],
    [76, "CRITICAL"],
    [90, "CRITICAL"],
    [100, "CRITICAL"],
  ] as const)("maps score %i to tier %s", (score, tier) => {
    expect(RiskService.categorize(score)).toBe(tier);
  });
});

describe("RiskService.computeCompositeTriageIndex", () => {
  it("overrides to 999.0 for CRITICAL category regardless of wait time", () => {
    const enqueuedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const index = RiskService.computeCompositeTriageIndex(90, "CRITICAL", enqueuedAt);
    expect(index).toBe(999.0);
  });

  it("overrides to 999.0 when riskScore >= 76 even if category is stale/mismatched", () => {
    const index = RiskService.computeCompositeTriageIndex(76, "HIGH", new Date().toISOString());
    expect(index).toBe(999.0);
  });

  it("computes riskScore*0.75 + aging weight for non-critical patients", () => {
    const now = new Date();
    const enqueuedAt = new Date(now.getTime() - 20 * 60 * 1000); // 20 min ago
    const index = RiskService.computeCompositeTriageIndex(40, "MODERATE", enqueuedAt.toISOString(), now);
    // 40 * 0.75 = 30, + (20/10 * 2.5) = 5 => 35
    expect(index).toBeCloseTo(35, 5);
  });

  it("caps aging weight at 25 points", () => {
    const now = new Date();
    const enqueuedAt = new Date(now.getTime() - 200 * 60 * 1000); // way past cap
    const index = RiskService.computeCompositeTriageIndex(20, "LOW", enqueuedAt.toISOString(), now);
    // 20 * 0.75 = 15, + 25 (capped) = 40
    expect(index).toBeCloseTo(40, 5);
  });

  it("never returns negative aging weight for a future enqueuedAt", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 60000).toISOString();
    expect(RiskService.computeQueueAgingWeight(future, now)).toBe(0);
  });
});
