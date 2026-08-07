import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../fhir/data/repository", () => ({
  createVitalOrSymptom: vi.fn(),
  searchVitalsByPatient: vi.fn(),
  getAllObservations: vi.fn().mockResolvedValue([]),
}));

import { createVitalOrSymptom, searchVitalsByPatient, getAllObservations } from "../../fhir/data/repository";
import { GET, POST } from "../../app/api/fhir/Observation/route";

describe("GET /fhir/Observation?patient=", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a searchset Bundle for a known patient", async () => {
    (searchVitalsByPatient as any).mockResolvedValue([
      {
        id: "o1",
        patientId: "p1",
        type: "heart_rate",
        heartRate: 76,
        recordedAt: "2026-08-08T09:05:00Z",
      },
    ]);

    const res = await GET(new NextRequest("http://localhost/fhir/Observation?patient=p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resourceType).toBe("Bundle");
    expect(body.type).toBe("searchset");
    expect(body.total).toBe(1);
    expect(body.entry[0].resource.code.coding[0].code).toBe("8867-4");
  });

  it("returns 200 searchset Bundle when patient query param is missing", async () => {
    (getAllObservations as any).mockResolvedValue([]);
    const res = await GET(new NextRequest("http://localhost/fhir/Observation"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resourceType).toBe("Bundle");
    expect(body.type).toBe("searchset");
  });
});

describe("POST /fhir/Observation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 201 for a valid blood pressure Observation", async () => {
    (createVitalOrSymptom as any).mockResolvedValue({
      id: "o2",
      patientId: "p1",
      type: "blood_pressure",
      systolic: 120,
      diastolic: 80,
      recordedAt: "2026-08-08T09:05:00Z",
    });

    const req = new NextRequest("http://localhost/fhir/Observation", {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify({
        resourceType: "Observation",
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: "85354-9" }] },
        subject: { reference: "Patient/p1" },
        effectiveDateTime: "2026-08-08T09:05:00Z",
        component: [
          {
            code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] },
            valueQuantity: { value: 120, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
          },
          {
            code: { coding: [{ system: "http://loinc.org", code: "8462-4" }] },
            valueQuantity: { value: 80, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.resourceType).toBe("Observation");
  });

  it("returns 400 for an Observation missing subject.reference", async () => {
    const req = new NextRequest("http://localhost/fhir/Observation", {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify({
        resourceType: "Observation",
        status: "final",
        code: { text: "Heart rate" },
        effectiveDateTime: "2026-08-08T09:05:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
