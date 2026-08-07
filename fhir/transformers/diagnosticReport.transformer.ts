/**
 * fhir/transformers/diagnosticReport.transformer.ts
 * Bi-directional adapter: InternalReport <-> FHIR R4 DiagnosticReport
 */

import type { InternalReport } from "../types";

export interface FhirDiagnosticReport {
  resourceType: "DiagnosticReport";
  id?: string;
  status: "registered" | "preliminary" | "final" | "amended";
  code: {
    text: string;
  };
  subject: { reference: string };
  effectiveDateTime: string;
  issued?: string;
  performer?: Array<{ reference: string }>;
  conclusion?: string;
  presentedForm?: Array<{ contentType: string; data?: string; title?: string }>;
}

const STATUS_MAP: Record<
  NonNullable<InternalReport["status"]>,
  FhirDiagnosticReport["status"]
> = {
  preliminary: "preliminary",
  final: "final",
  amended: "amended",
};

export function toFhirDiagnosticReport(
  report: InternalReport
): FhirDiagnosticReport {
  return {
    resourceType: "DiagnosticReport",
    id: report.id,
    status: report.status ? STATUS_MAP[report.status] : "final",
    code: { text: report.title },
    subject: { reference: `Patient/${report.patientId}` },
    effectiveDateTime: report.createdAt,
    issued: report.createdAt,
    ...(report.doctorId
      ? { performer: [{ reference: `Practitioner/${report.doctorId}` }] }
      : {}),
    ...(report.conclusion ? { conclusion: report.conclusion } : {}),
    ...(report.summary
      ? {
          presentedForm: [
            {
              contentType: "text/plain",
              data: Buffer.from(report.summary, "utf-8").toString("base64"),
              title: report.title,
            },
          ],
        }
      : {}),
  };
}

export function fromFhirDiagnosticReport(
  resource: FhirDiagnosticReport
): Omit<InternalReport, "id" | "createdAt"> {
  if (resource.resourceType !== "DiagnosticReport") {
    throw new Error(
      `fromFhirDiagnosticReport expected resourceType "DiagnosticReport", got "${resource.resourceType}"`
    );
  }

  const patientId = resource.subject?.reference?.replace(/^Patient\//, "");
  if (!patientId) {
    throw new Error(
      "FHIR DiagnosticReport.subject.reference must be Patient/{id}"
    );
  }
  if (!resource.code?.text) {
    throw new Error("FHIR DiagnosticReport.code.text (report title) is required");
  }

  const doctorId = resource.performer?.[0]?.reference?.replace(
    /^Practitioner\//,
    ""
  );

  const summaryForm = resource.presentedForm?.find(
    (f) => f.contentType === "text/plain" && f.data
  );
  const summary = summaryForm?.data
    ? Buffer.from(summaryForm.data, "base64").toString("utf-8")
    : undefined;

  const reverseStatus = (
    Object.entries(STATUS_MAP) as Array<
      [NonNullable<InternalReport["status"]>, FhirDiagnosticReport["status"]]
    >
  ).find(([, v]) => v === resource.status)?.[0];

  return {
    patientId,
    title: resource.code.text,
    summary,
    conclusion: resource.conclusion,
    doctorId,
    status: reverseStatus,
  };
}
