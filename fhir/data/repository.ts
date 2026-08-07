/**
 * fhir/data/repository.ts
 *
 * The ONLY file in the FHIR layer that should talk to your database.
 * Every route handler goes through here, never directly through
 * `@supabase/supabase-js`. This keeps the FHIR adapter fully isolated
 * from your app's persistence details, per the gateway pattern.
 *
 * TODO: Replace each stub with a real Supabase query against your
 * actual tables/columns. Nothing outside this file needs to change
 * once you do.
 */

import type {
  InternalPatient,
  InternalVitalOrSymptom,
  InternalReport,
  InternalCarePlan,
} from "../types";

// Uncomment and point at your existing Supabase client factory.
// import { createClient } from "@/lib/supabase/server";

export async function getPatientById(
  id: string
): Promise<InternalPatient | null> {
  // TODO: wire to Supabase, e.g.:
  // const supabase = await createClient();
  // const { data, error } = await supabase
  //   .from("patients")
  //   .select("*")
  //   .eq("id", id)
  //   .single();
  // if (error || !data) return null;
  // return {
  //   id: data.id,
  //   fullName: data.full_name,
  //   dob: data.dob,
  //   gender: data.gender,
  //   phone: data.phone,
  //   language: data.language,
  //   tokenNumber: data.token_number,
  //   department: data.department,
  //   createdAt: data.created_at,
  // };

  throw new Error(
    "getPatientById is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function createPatient(
  patient: Omit<InternalPatient, "id" | "createdAt">
): Promise<InternalPatient> {
  // TODO: wire to Supabase insert, return the created row mapped to InternalPatient.
  throw new Error(
    "createPatient is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function searchVitalsByPatient(
  patientId: string
): Promise<InternalVitalOrSymptom[]> {
  // TODO: wire to Supabase, filter by patient_id.
  throw new Error(
    "searchVitalsByPatient is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function createVitalOrSymptom(
  entry: Omit<InternalVitalOrSymptom, "id">
): Promise<InternalVitalOrSymptom> {
  // TODO: wire to Supabase insert.
  throw new Error(
    "createVitalOrSymptom is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function getReportById(
  id: string
): Promise<InternalReport | null> {
  throw new Error(
    "getReportById is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function searchReportsByPatient(
  patientId: string
): Promise<InternalReport[]> {
  throw new Error(
    "searchReportsByPatient is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function getCarePlanById(
  id: string
): Promise<InternalCarePlan | null> {
  throw new Error(
    "getCarePlanById is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}

export async function searchCarePlansByPatient(
  patientId: string
): Promise<InternalCarePlan[]> {
  throw new Error(
    "searchCarePlansByPatient is not wired to a data source yet. Implement in fhir/data/repository.ts"
  );
}
