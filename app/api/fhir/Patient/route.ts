import { NextRequest, NextResponse } from "next/server";
import { withFhirValidation } from "@/fhir/middleware/fhirValidator";
import { toFhirPatient, fromFhirPatient, type FhirPatient } from "@/fhir/transformers/patient.transformer";
import { createPatient } from "@/fhir/data/repository";
import { serverError } from "@/fhir/utils/operationOutcome";

/**
 * POST /fhir/Patient
 * Validates an incoming FHIR Patient resource, maps it to the internal
 * data model, persists it via the repository layer, and returns the
 * created resource re-serialized as FHIR (with server-assigned id).
 */
export const POST = withFhirValidation(
  "Patient",
  async (req: NextRequest, body: FhirPatient) => {
    try {
      const internalInput = fromFhirPatient(body);
      const created = await createPatient(internalInput);
      return NextResponse.json(toFhirPatient(created), {
        status: 201,
        headers: {
          "Content-Type": "application/fhir+json",
          Location: `/fhir/Patient/${created.id}`,
        },
      });
    } catch (err) {
      return NextResponse.json(
        serverError(err instanceof Error ? err.message : "Unknown error creating Patient"),
        { status: 500, headers: { "Content-Type": "application/fhir+json" } }
      );
    }
  }
);
