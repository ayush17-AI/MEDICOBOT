import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../fhir/data/repository", () => ({
  createPatient: vi.fn(),
  getPatientById: vi.fn(),
}));

import { createPatient, getPatientById } from "../../fhir/data/repository";
import { POST } from "../../app/api/fhir/Patient/route";
import { GET } from "../../app/api/fhir/Patient/[id]/route";

function makeRequest(body: unknown, contentType = "application/fhir+json") {
  return new NextRequest("http://localhost/fhir/Patient", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: JSON.stringify(body),
  });
}

describe("POST /fhir/Patient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 201 and a FHIR Patient for a valid payload", async () => {
    (createPatient as any).mockResolvedValue({
      id: "p1",
      fullName: "Asha Verma",
      createdAt: "2026-08-08T09:00:00Z",
    });

    const res = await POST(
      makeRequest({ resourceType: "Patient", name: [{ text: "Asha Verma" }] })
    );

    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toBe("application/fhir+json");
    const body = await res.json();
    expect(body.resourceType).toBe("Patient");
    expect(body.id).toBe("p1");
  });

  it("returns 400 with an OperationOutcome for a missing name", async () => {
    const res = await POST(makeRequest({ resourceType: "Patient" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.resourceType).toBe("OperationOutcome");
  });

  it("returns 415 for a non-FHIR content type", async () => {
    const res = await POST(
      makeRequest({ resourceType: "Patient", name: [{ text: "x" }] }, "text/plain")
    );
    expect(res.status).toBe(415);
  });
});

describe("GET /fhir/Patient/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with a transformed FHIR Patient when found", async () => {
    (getPatientById as any).mockResolvedValue({
      id: "p1",
      fullName: "Asha Verma",
      createdAt: "2026-08-08T09:00:00Z",
    });

    const res = await GET(new NextRequest("http://localhost/fhir/Patient/p1"), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resourceType).toBe("Patient");
    expect(body.id).toBe("p1");
  });

  it("returns 404 with an OperationOutcome when not found", async () => {
    (getPatientById as any).mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/fhir/Patient/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.resourceType).toBe("OperationOutcome");
  });
});
