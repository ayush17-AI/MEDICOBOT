import { NextRequest, NextResponse } from "next/server";
import { withFhirValidation } from "@/fhir/middleware/fhirValidator";
import {
  toFhirObservation,
  fromFhirObservation,
  type FhirObservation,
} from "@/fhir/transformers/observation.transformer";
import { createVitalOrSymptom, searchVitalsByPatient, getAllObservations } from "@/fhir/data/repository";
import { invalidResource, serverError } from "@/fhir/utils/operationOutcome";

/**
 * GET /fhir/Observation?patient=:patientId
 * Returns a FHIR Bundle (type: searchset) of observations.
 */
export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patient");

  try {
    const entries = patientId
      ? await searchVitalsByPatient(patientId)
      : await getAllObservations();

    const resources = entries.map(toFhirObservation);

    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: resources.length,
      entry: resources.map((resource) => ({
        fullUrl: `Observation/${resource.id}`,
        resource,
      })),
    };

    return NextResponse.json(bundle, {
      status: 200,
      headers: { "Content-Type": "application/fhir+json" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        resourceType: "Bundle",
        type: "searchset",
        total: 0,
        entry: [],
      },
      { status: 200, headers: { "Content-Type": "application/fhir+json" } }
    );
  }
}

/**
 * POST /fhir/Observation
 * Validates an incoming FHIR Observation, maps to the internal model,
 * and persists it.
 */
export const POST = withFhirValidation(
  "Observation",
  async (req: NextRequest, body: FhirObservation) => {
    try {
      const internalInput = fromFhirObservation(body);
      const created = await createVitalOrSymptom(internalInput);
      return NextResponse.json(toFhirObservation(created), {
        status: 201,
        headers: {
          "Content-Type": "application/fhir+json",
          Location: `/fhir/Observation/${created.id}`,
        },
      });
    } catch (err) {
      return NextResponse.json(
        serverError(err instanceof Error ? err.message : "Unknown error creating Observation"),
        { status: 500, headers: { "Content-Type": "application/fhir+json" } }
      );
    }
  }
);
