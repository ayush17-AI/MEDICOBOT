import { describe, it, expect } from "vitest";
import { toFhirPatient, fromFhirPatient } from "../../fhir/transformers/patient.transformer";
import {
  toFhirObservation,
  fromFhirObservation,
} from "../../fhir/transformers/observation.transformer";
import {
  toFhirDiagnosticReport,
  fromFhirDiagnosticReport,
} from "../../fhir/transformers/diagnosticReport.transformer";
import { toFhirCarePlan, fromFhirCarePlan } from "../../fhir/transformers/carePlan.transformer";

describe("Patient transformer", () => {
  it("round-trips internal -> FHIR -> internal", () => {
    const internal = {
      id: "p1",
      fullName: "Asha Verma",
      dob: "1990-05-14",
      gender: "female" as const,
      phone: "+91-9876500000",
      language: "hi",
      tokenNumber: "A-42",
      department: "Cardiology",
      createdAt: "2026-08-08T09:00:00Z",
    };

    const fhir = toFhirPatient(internal);
    expect(fhir.resourceType).toBe("Patient");
    expect(fhir.name?.[0].text).toBe("Asha Verma");
    expect(fhir.identifier?.[0].value).toBe("p1");

    const back = fromFhirPatient(fhir);
    expect(back.fullName).toBe(internal.fullName);
    expect(back.dob).toBe(internal.dob);
    expect(back.tokenNumber).toBe(internal.tokenNumber);
    expect(back.department).toBe(internal.department);
  });

  it("rejects a Patient with no name", () => {
    expect(() =>
      fromFhirPatient({ resourceType: "Patient" } as any)
    ).toThrow();
  });
});

describe("Observation transformer", () => {
  it("maps blood pressure to LOINC 85354-9 with 8480-6/8462-4 components", () => {
    const fhir = toFhirObservation({
      id: "o1",
      patientId: "p1",
      type: "blood_pressure",
      systolic: 120,
      diastolic: 80,
      recordedAt: "2026-08-08T09:05:00Z",
    });

    expect(fhir.code.coding[0].code).toBe("85354-9");
    expect(fhir.component?.find((c) => c.code.coding[0].code === "8480-6")?.valueQuantity.value).toBe(120);
    expect(fhir.component?.find((c) => c.code.coding[0].code === "8462-4")?.valueQuantity.value).toBe(80);

    const back = fromFhirObservation(fhir);
    expect(back.type).toBe("blood_pressure");
    expect(back.systolic).toBe(120);
    expect(back.diastolic).toBe(80);
  });

  it("maps heart rate to LOINC 8867-4", () => {
    const fhir = toFhirObservation({
      id: "o2",
      patientId: "p1",
      type: "heart_rate",
      heartRate: 76,
      recordedAt: "2026-08-08T09:05:00Z",
    });
    expect(fhir.code.coding[0].code).toBe("8867-4");
    expect(fhir.valueQuantity?.value).toBe(76);
  });

  it("maps SpO2 to LOINC 59408-5", () => {
    const fhir = toFhirObservation({
      id: "o3",
      patientId: "p1",
      type: "spo2",
      spo2: 98,
      recordedAt: "2026-08-08T09:05:00Z",
    });
    expect(fhir.code.coding[0].code).toBe("59408-5");
    expect(fhir.valueQuantity?.unit).toBe("%");
  });

  it("round-trips a symptom observation", () => {
    const fhir = toFhirObservation({
      id: "o4",
      patientId: "p1",
      type: "symptom",
      symptomText: "chest pain",
      recordedAt: "2026-08-08T09:05:00Z",
    });
    const back = fromFhirObservation(fhir);
    expect(back.type).toBe("symptom");
    expect(back.symptomText).toBe("chest pain");
  });
});

describe("DiagnosticReport transformer", () => {
  it("round-trips internal -> FHIR -> internal", () => {
    const internal = {
      id: "r1",
      patientId: "p1",
      title: "OPD Consultation Summary",
      summary: "Patient presented with mild fever.",
      conclusion: "Prescribed rest and paracetamol.",
      doctorId: "d1",
      createdAt: "2026-08-08T09:10:00Z",
      status: "final" as const,
    };
    const fhir = toFhirDiagnosticReport(internal);
    expect(fhir.subject.reference).toBe("Patient/p1");
    const back = fromFhirDiagnosticReport(fhir);
    expect(back.title).toBe(internal.title);
    expect(back.summary).toBe(internal.summary);
    expect(back.status).toBe("final");
  });
});

describe("CarePlan transformer", () => {
  it("round-trips internal -> FHIR -> internal", () => {
    const internal = {
      id: "c1",
      patientId: "p1",
      title: "Post-consultation follow-up",
      goals: ["Reduce fever within 48 hours"],
      activities: ["Take paracetamol 500mg every 6 hours"],
      status: "active" as const,
      createdAt: "2026-08-08T09:15:00Z",
    };
    const fhir = toFhirCarePlan(internal);
    expect(fhir.status).toBe("active");
    const back = fromFhirCarePlan(fhir);
    expect(back.title).toBe(internal.title);
    expect(back.goals?.[0]).toBe(internal.goals?.[0]);
  });
});
