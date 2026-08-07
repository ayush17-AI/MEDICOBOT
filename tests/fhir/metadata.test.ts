import { describe, it, expect } from "vitest";
import { buildCapabilityStatement } from "../../fhir/capabilityStatement";
import { GET } from "../../app/api/fhir/metadata/route";

describe("CapabilityStatement", () => {
  it("has a valid FHIR R4 shape", () => {
    const cs = buildCapabilityStatement();
    expect(cs.resourceType).toBe("CapabilityStatement");
    expect(cs.status).toBe("active");
    expect(cs.fhirVersion).toBe("4.0.1");
    expect(cs.format).toContain("application/fhir+json");

    const resourceTypes = cs.rest[0].resource.map((r) => r.type);
    expect(resourceTypes).toEqual(
      expect.arrayContaining(["Patient", "Observation", "DiagnosticReport", "CarePlan"])
    );
  });
});

describe("GET /fhir/metadata route", () => {
  it("returns 200 with application/fhir+json and a valid CapabilityStatement", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/fhir+json");

    const body = await res.json();
    expect(body.resourceType).toBe("CapabilityStatement");
  });
});
