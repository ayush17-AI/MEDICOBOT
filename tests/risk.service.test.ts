import { describe, expect, it } from "vitest";
import { RiskService } from "@/src/services/risk.service";

describe("RiskService.evaluate", () => {
  it("returns 0 and no factors for an empty payload", () => {
    const { riskScore, factors } = RiskService.evaluate({});
    expect(riskScore).toBe(0);
    expect(factors).toHaveLength(0);
  });

  it("scores critical hypoxia correctly", () => {
    const { riskScore, factors } = RiskService.evaluate({ spo2: 85 });
    expect(riskScore).toBe(50);
    expect(factors[0]).toMatchObject({ parameter: "SpO2", impact: 50 });
  });

  it("scores moderate hypoxia correctly", () => {
    const { riskScore } = RiskService.evaluate({ spo2: 90 });
    expect(riskScore).toBe(25);
  });

  it("does not score SpO2 at the boundary of normal (93)", () => {
    const { riskScore } = RiskService.evaluate({ spo2: 93 });
    expect(riskScore).toBe(0);
  });

  it("scores severe dysrhythmia for very high and very low HR", () => {
    expect(RiskService.evaluate({ heartRate: 140 }).riskScore).toBe(30);
    expect(RiskService.evaluate({ heartRate: 35 }).riskScore).toBe(30);
  });

  it("scores abnormal HR band correctly", () => {
    expect(RiskService.evaluate({ heartRate: 110 }).riskScore).toBe(15);
    expect(RiskService.evaluate({ heartRate: 45 }).riskScore).toBe(15);
  });

  it("scores hypertensive crisis / severe hypotension", () => {
    expect(RiskService.evaluate({ systolicBP: 185 }).riskScore).toBe(35);
    expect(RiskService.evaluate({ systolicBP: 78 }).riskScore).toBe(35);
  });

  it("scores elevated/low SBP band correctly", () => {
    expect(RiskService.evaluate({ systolicBP: 150 }).riskScore).toBe(15);
    expect(RiskService.evaluate({ systolicBP: 85 }).riskScore).toBe(15);
  });

  it("adds 20 points per distinct matched high-risk symptom keyword", () => {
    const { riskScore, factors } = RiskService.evaluate({
      symptoms: ["Sudden chest pain", "Shortness of breath since morning"],
    });
    expect(riskScore).toBe(40);
    expect(factors).toHaveLength(2);
  });

  it("does not double-count a keyword mentioned in multiple symptom strings", () => {
    const { riskScore, factors } = RiskService.evaluate({
      symptoms: ["chest pain", "worsening chest pain"],
    });
    expect(riskScore).toBe(20);
    expect(factors).toHaveLength(1);
  });

  it("caps the total score at 100", () => {
    const { riskScore } = RiskService.evaluate({
      spo2: 80, // 50
      heartRate: 150, // 30
      systolicBP: 190, // 35
      symptoms: ["chest pain", "unresponsive"], // 40
    });
    expect(riskScore).toBe(100);
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
    [100, "CRITICAL"],
  ] as const)("maps score %i to tier %s", (score, tier) => {
    expect(RiskService.categorize(score)).toBe(tier);
  });
});

describe("RiskService.computeCompositeTriageIndex", () => {
  it("overrides to 999.0 for CRITICAL category regardless of wait time", () => {
    const enqueuedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const index = RiskService.computeCompositeTriageIndex(80, "CRITICAL", enqueuedAt);
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
