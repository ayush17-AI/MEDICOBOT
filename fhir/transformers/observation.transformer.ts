/**
 * fhir/transformers/observation.transformer.ts
 * Bi-directional adapter: InternalVitalOrSymptom <-> FHIR R4 Observation
 *
 * LOINC codes used:
 *   Blood pressure panel : 85354-9
 *     - systolic component : 8480-6
 *     - diastolic component: 8462-4
 *   Heart rate            : 8867-4
 *   SpO2                  : 59408-5
 * Symptoms are coded as an Observation with category "survey" and
 * (optionally) a SNOMED CT code if one was already assigned upstream.
 */

import type { InternalVitalOrSymptom } from "../types";

const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";

export interface FhirObservation {
  resourceType: "Observation";
  id?: string;
  status: "final" | "preliminary" | "registered" | "amended";
  category?: Array<{
    coding: Array<{ system: string; code: string; display?: string }>;
  }>;
  code: {
    coding: Array<{ system: string; code: string; display?: string }>;
    text?: string;
  };
  subject: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueString?: string;
  component?: Array<{
    code: { coding: Array<{ system: string; code: string; display?: string }> };
    valueQuantity: { value: number; unit: string; system: string; code: string };
  }>;
  note?: Array<{ text: string }>;
}

const VITAL_SIGNS_CATEGORY = [
  {
    system: "http://terminology.hl7.org/CodeSystem/observation-category",
    code: "vital-signs",
    display: "Vital Signs",
  },
];

const SURVEY_CATEGORY = [
  {
    system: "http://terminology.hl7.org/CodeSystem/observation-category",
    code: "survey",
    display: "Survey",
  },
];

export function toFhirObservation(
  entry: InternalVitalOrSymptom
): FhirObservation {
  const base = {
    resourceType: "Observation" as const,
    id: entry.id,
    status: "final" as const,
    subject: { reference: `Patient/${entry.patientId}` },
    effectiveDateTime: entry.recordedAt,
    ...(entry.note ? { note: [{ text: entry.note }] } : {}),
  };

  switch (entry.type) {
    case "blood_pressure": {
      if (entry.systolic == null || entry.diastolic == null) {
        throw new Error(
          "blood_pressure entries require both systolic and diastolic values"
        );
      }
      return {
        ...base,
        category: [{ coding: VITAL_SIGNS_CATEGORY }],
        code: {
          coding: [
            {
              system: LOINC,
              code: "85354-9",
              display: "Blood pressure panel with all children optional",
            },
          ],
          text: "Blood Pressure",
        },
        component: [
          {
            code: {
              coding: [
                { system: LOINC, code: "8480-6", display: "Systolic blood pressure" },
              ],
            },
            valueQuantity: {
              value: entry.systolic,
              unit: "mmHg",
              system: "http://unitsofmeasure.org",
              code: "mm[Hg]",
            },
          },
          {
            code: {
              coding: [
                { system: LOINC, code: "8462-4", display: "Diastolic blood pressure" },
              ],
            },
            valueQuantity: {
              value: entry.diastolic,
              unit: "mmHg",
              system: "http://unitsofmeasure.org",
              code: "mm[Hg]",
            },
          },
        ],
      };
    }

    case "heart_rate": {
      if (entry.heartRate == null) {
        throw new Error("heart_rate entries require a heartRate value");
      }
      return {
        ...base,
        category: [{ coding: VITAL_SIGNS_CATEGORY }],
        code: {
          coding: [{ system: LOINC, code: "8867-4", display: "Heart rate" }],
          text: "Heart Rate",
        },
        valueQuantity: {
          value: entry.heartRate,
          unit: "beats/minute",
          system: "http://unitsofmeasure.org",
          code: "/min",
        },
      };
    }

    case "spo2": {
      if (entry.spo2 == null) {
        throw new Error("spo2 entries require a spo2 value");
      }
      return {
        ...base,
        category: [{ coding: VITAL_SIGNS_CATEGORY }],
        code: {
          coding: [
            {
              system: LOINC,
              code: "59408-5",
              display: "Oxygen saturation in Arterial blood by Pulse oximetry",
            },
          ],
          text: "SpO2",
        },
        valueQuantity: {
          value: entry.spo2,
          unit: "%",
          system: "http://unitsofmeasure.org",
          code: "%",
        },
      };
    }

    case "symptom": {
      if (!entry.symptomText) {
        throw new Error("symptom entries require symptomText");
      }
      return {
        ...base,
        category: [{ coding: SURVEY_CATEGORY }],
        code: {
          coding: entry.snomedCode
            ? [{ system: SNOMED, code: entry.snomedCode, display: entry.symptomText }]
            : [],
          text: entry.symptomText,
        },
        valueString: entry.symptomText,
      };
    }
  }
}

export function fromFhirObservation(
  resource: FhirObservation
): Omit<InternalVitalOrSymptom, "id"> {
  if (resource.resourceType !== "Observation") {
    throw new Error(
      `fromFhirObservation expected resourceType "Observation", got "${resource.resourceType}"`
    );
  }

  const patientId = resource.subject?.reference?.replace(/^Patient\//, "");
  if (!patientId) {
    throw new Error("FHIR Observation.subject.reference must be Patient/{id}");
  }
  if (!resource.effectiveDateTime) {
    throw new Error("FHIR Observation.effectiveDateTime is required");
  }

  const loincCode = resource.code?.coding?.find((c) => c.system === LOINC)?.code;
  const note = resource.note?.[0]?.text;

  if (loincCode === "85354-9") {
    const systolic = resource.component?.find((c) =>
      c.code.coding.some((cc) => cc.code === "8480-6")
    )?.valueQuantity.value;
    const diastolic = resource.component?.find((c) =>
      c.code.coding.some((cc) => cc.code === "8462-4")
    )?.valueQuantity.value;
    if (systolic == null || diastolic == null) {
      throw new Error("Blood pressure Observation missing systolic/diastolic component");
    }
    return {
      patientId,
      type: "blood_pressure",
      recordedAt: resource.effectiveDateTime,
      systolic,
      diastolic,
      note,
    };
  }

  if (loincCode === "8867-4") {
    if (resource.valueQuantity?.value == null) {
      throw new Error("Heart rate Observation missing valueQuantity");
    }
    return {
      patientId,
      type: "heart_rate",
      recordedAt: resource.effectiveDateTime,
      heartRate: resource.valueQuantity.value,
      note,
    };
  }

  if (loincCode === "59408-5") {
    if (resource.valueQuantity?.value == null) {
      throw new Error("SpO2 Observation missing valueQuantity");
    }
    return {
      patientId,
      type: "spo2",
      recordedAt: resource.effectiveDateTime,
      spo2: resource.valueQuantity.value,
      note,
    };
  }

  // Fall back to symptom/survey observation
  const symptomText = resource.valueString ?? resource.code?.text;
  if (!symptomText) {
    throw new Error(
      "Unrecognized Observation: no known LOINC code and no valueString/code.text for a symptom"
    );
  }
  const snomedCode = resource.code?.coding?.find((c) => c.system === SNOMED)?.code;

  return {
    patientId,
    type: "symptom",
    recordedAt: resource.effectiveDateTime,
    symptomText,
    snomedCode,
    note,
  };
}
