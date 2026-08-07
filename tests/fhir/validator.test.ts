import { describe, it, expect } from "vitest";
import { validateResourceShape } from "../../fhir/middleware/fhirValidator";

describe("validateResourceShape", () => {
  it("accepts a valid Patient", () => {
    const result = validateResourceShape("Patient", {
      resourceType: "Patient",
      name: [{ text: "Asha Verma" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a Patient missing name", () => {
    const result = validateResourceShape("Patient", { resourceType: "Patient" });
    expect(result.valid).toBe(false);
    expect(result.outcome?.resourceType).toBe("OperationOutcome");
    expect(result.outcome?.issue[0].code).toBe("invalid");
  });

  it("rejects a resourceType mismatch", () => {
    const result = validateResourceShape("Patient", {
      resourceType: "Observation",
      name: [{ text: "x" }],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts a valid Observation", () => {
    const result = validateResourceShape("Observation", {
      resourceType: "Observation",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: "8867-4" }] },
      subject: { reference: "Patient/p1" },
      effectiveDateTime: "2026-08-08T09:05:00Z",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects an Observation with a malformed subject reference", () => {
    const result = validateResourceShape("Observation", {
      resourceType: "Observation",
      status: "final",
      code: { text: "Heart rate" },
      subject: { reference: "p1" }, // missing "Patient/" prefix
      effectiveDateTime: "2026-08-08T09:05:00Z",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects an Observation with an invalid effectiveDateTime", () => {
    const result = validateResourceShape("Observation", {
      resourceType: "Observation",
      status: "final",
      code: { text: "Heart rate" },
      subject: { reference: "Patient/p1" },
      effectiveDateTime: "not-a-date",
    });
    expect(result.valid).toBe(false);
  });
});
