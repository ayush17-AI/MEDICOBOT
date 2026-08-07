import { NextRequest, NextResponse } from "next/server";
import { withFhirValidation } from "@/fhir/middleware/fhirValidator";
import {
  toFhirCarePlan,
  fromFhirCarePlan,
  type FhirCarePlan,
} from "@/fhir/transformers/carePlan.transformer";
import { searchCarePlansByPatient } from "@/fhir/data/repository";
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
    const plans = await searchCarePlansByPatient(patientId);
    const resources = plans.map(toFhirCarePlan);

    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: resources.length,
      entry: resources.map((resource) => ({
        fullUrl: `CarePlan/${resource.id}`,
        resource,
      })),
    };

    return NextResponse.json(bundle, {
      status: 200,
      headers: { "Content-Type": "application/fhir+json" },
    });
  } catch (err) {
    return NextResponse.json(
      serverError(err instanceof Error ? err.message : "Unknown error searching CarePlans"),
      { status: 500, headers: { "Content-Type": "application/fhir+json" } }
    );
  }
}

// NOTE: mirrors the DiagnosticReport route — add createCarePlan() to
// fhir/data/repository.ts to enable persistence for this endpoint.
export const POST = withFhirValidation(
  "CarePlan",
  async (req: NextRequest, body: FhirCarePlan) => {
    try {
      const internalInput = fromFhirCarePlan(body);
      return NextResponse.json(
        serverError(
          "createCarePlan is not implemented in fhir/data/repository.ts yet — add it to enable this endpoint."
        ),
        { status: 501, headers: { "Content-Type": "application/fhir+json" } }
      );
    } catch (err) {
      return NextResponse.json(
        serverError(err instanceof Error ? err.message : "Unknown error creating CarePlan"),
        { status: 500, headers: { "Content-Type": "application/fhir+json" } }
      );
    }
  }
);
