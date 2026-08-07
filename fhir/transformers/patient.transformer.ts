/**
 * fhir/transformers/patient.transformer.ts
 * Bi-directional adapter: InternalPatient <-> FHIR R4 Patient
 */

import type { InternalPatient } from "../types";

export interface FhirPatient {
  resourceType: "Patient";
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  active?: boolean;
  name?: Array<{
    text: string;
  }>;
  telecom?: Array<{
    system: "phone" | "email";
    value: string;
    use?: "mobile" | "home" | "work";
  }>;
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  communication?: Array<{
    language: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
  }>;
  meta?: {
    lastUpdated?: string;
  };
}

const TOKEN_EXTENSION_URL =
  "https://medicobot.example.org/fhir/StructureDefinition/kiosk-token-number";
const DEPARTMENT_EXTENSION_URL =
  "https://medicobot.example.org/fhir/StructureDefinition/allocated-department";
const IDENTIFIER_SYSTEM = "https://medicobot.example.org/patient-id";

/** Internal app model -> FHIR R4 Patient resource */
export function toFhirPatient(patient: InternalPatient): FhirPatient {
  const fhirPatient: FhirPatient = {
    resourceType: "Patient",
    id: patient.id,
    identifier: [
      {
        system: IDENTIFIER_SYSTEM,
        value: patient.id,
      },
    ],
    active: true,
    name: [{ text: patient.fullName }],
  };

  if (patient.phone) {
    fhirPatient.telecom = [
      { system: "phone", value: patient.phone, use: "mobile" },
    ];
  }

  if (patient.gender) {
    fhirPatient.gender = patient.gender;
  }

  if (patient.dob) {
    fhirPatient.birthDate = patient.dob;
  }

  if (patient.language) {
    fhirPatient.communication = [
      {
        language: {
          coding: [
            {
              system: "urn:ietf:bcp:47",
              code: patient.language,
              display: patient.language,
            },
          ],
        },
      },
    ];
  }

  const extensions: FhirPatient["extension"] = [];
  if (patient.tokenNumber) {
    extensions.push({
      url: TOKEN_EXTENSION_URL,
      valueString: patient.tokenNumber,
    });
  }
  if (patient.department) {
    extensions.push({
      url: DEPARTMENT_EXTENSION_URL,
      valueString: patient.department,
    });
  }
  if (extensions.length > 0) {
    fhirPatient.extension = extensions;
  }

  if (patient.createdAt) {
    fhirPatient.meta = { lastUpdated: patient.createdAt };
  }

  return fhirPatient;
}

/** FHIR R4 Patient resource -> Internal app model (create/update input) */
export function fromFhirPatient(
  resource: FhirPatient
): Omit<InternalPatient, "id" | "createdAt"> {
  if (resource.resourceType !== "Patient") {
    throw new Error(
      `fromFhirPatient expected resourceType "Patient", got "${resource.resourceType}"`
    );
  }

  const fullName = resource.name?.[0]?.text?.trim();
  if (!fullName) {
    throw new Error("FHIR Patient.name[0].text is required");
  }

  const phone = resource.telecom?.find((t) => t.system === "phone")?.value;
  const language = resource.communication?.[0]?.language?.coding?.[0]?.code;
  const tokenNumber = resource.extension?.find(
    (e) => e.url === TOKEN_EXTENSION_URL
  )?.valueString;
  const department = resource.extension?.find(
    (e) => e.url === DEPARTMENT_EXTENSION_URL
  )?.valueString;

  return {
    fullName,
    dob: resource.birthDate,
    gender: resource.gender,
    phone,
    language,
    tokenNumber,
    department,
  };
}
