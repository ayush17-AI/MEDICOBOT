import { NextRequest, NextResponse } from "next/server";
import { toFhirPatient } from "@/fhir/transformers/patient.transformer";
import { getPatientById } from "@/fhir/data/repository";
import { notFound, serverError } from "@/fhir/utils/operationOutcome";

/**
 * GET /fhir/Patient/:id
 * Fetches the internal patient record and returns it transformed
 * into a FHIR R4 Patient resource.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const patient = await getPatientById(id);
    if (!patient) {
      return NextResponse.json(notFound(`No Patient found with id "${id}"`), {
        status: 404,
        headers: { "Content-Type": "application/fhir+json" },
      });
    }
    return NextResponse.json(toFhirPatient(patient), {
      status: 200,
      headers: { "Content-Type": "application/fhir+json" },
    });
  } catch (err) {
    return NextResponse.json(
      serverError(err instanceof Error ? err.message : "Unknown error fetching Patient"),
      { status: 500, headers: { "Content-Type": "application/fhir+json" } }
    );
  }
}
