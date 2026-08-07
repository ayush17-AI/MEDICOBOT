import { NextRequest, NextResponse } from "next/server";
import { withFhirValidation } from "@/fhir/middleware/fhirValidator";
import { toFhirPatient, fromFhirPatient, type FhirPatient } from "@/fhir/transformers/patient.transformer";
import { createPatient, getAllPatients } from "@/fhir/data/repository";
import { serverError } from "@/fhir/utils/operationOutcome";

/**
 * GET /fhir/Patient
 * Returns a FHIR Bundle (type: searchset) of patients.
 */
export async function GET(req: NextRequest) {
  try {
    const nameFilter = req.nextUrl.searchParams.get("name");
    const patients = await getAllPatients();

    let filtered = patients;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      filtered = patients.filter((p) => p.fullName.toLowerCase().includes(lower));
    }

    const resources = filtered.map(toFhirPatient);

    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: resources.length,
      entry: resources.map((resource) => ({
        fullUrl: `Patient/${resource.id}`,
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
