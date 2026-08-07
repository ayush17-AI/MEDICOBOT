import { NextRequest, NextResponse } from "next/server";
import { withFhirValidation } from "@/fhir/middleware/fhirValidator";
import {
  toFhirDiagnosticReport,
  fromFhirDiagnosticReport,
  type FhirDiagnosticReport,
} from "@/fhir/transformers/diagnosticReport.transformer";
import { searchReportsByPatient } from "@/fhir/data/repository";
import { invalidResource, serverError } from "@/fhir/utils/operationOutcome";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patient");

  if (!patientId) {
    return NextResponse.json(
      invalidResource('Query parameter "patient" is required, e.g. ?patient=123'),
      { status: 400, headers: { "Content-Type": "application/fhir+json" } }
    );
  }

  try {
    const reports = await searchReportsByPatient(patientId);
    const resources = reports.map(toFhirDiagnosticReport);

    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: resources.length,
      entry: resources.map((resource) => ({
        fullUrl: `DiagnosticReport/${resource.id}`,
        resource,
      })),
    };

    return NextResponse.json(bundle, {
      status: 200,
      headers: { "Content-Type": "application/fhir+json" },
    });
  } catch (err) {
    return NextResponse.json(
      serverError(err instanceof Error ? err.message : "Unknown error searching DiagnosticReports"),
      { status: 500, headers: { "Content-Type": "application/fhir+json" } }
    );
  }
}

// NOTE: no createReport() stub exists yet in fhir/data/repository.ts —
// add one (mirroring createVitalOrSymptom) before wiring this POST handler
// to persistence. Left here so the route/transform/validate pipeline is
// complete and only the DB call needs filling in.
export const POST = withFhirValidation(
  "DiagnosticReport",
  async (req: NextRequest, body: FhirDiagnosticReport) => {
    try {
      const internalInput = fromFhirDiagnosticReport(body);
      // const created = await createReport(internalInput); // TODO: add to repository.ts
      return NextResponse.json(
        serverError(
          "createReport is not implemented in fhir/data/repository.ts yet — add it to enable this endpoint."
        ),
        { status: 501, headers: { "Content-Type": "application/fhir+json" } }
      );
    } catch (err) {
      return NextResponse.json(
        serverError(err instanceof Error ? err.message : "Unknown error creating DiagnosticReport"),
        { status: 500, headers: { "Content-Type": "application/fhir+json" } }
      );
    }
  }
);
