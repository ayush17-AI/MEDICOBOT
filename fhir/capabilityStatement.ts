/**
 * fhir/capabilityStatement.ts
 * Builds the FHIR R4 CapabilityStatement served at GET /fhir/metadata.
 */

export function buildCapabilityStatement() {
  const now = new Date().toISOString();

  return {
    resourceType: "CapabilityStatement",
    status: "active",
    date: now,
    publisher: "MEDICOBOT",
    kind: "instance",
    software: {
      name: "MEDICOBOT FHIR Gateway",
      version: "1.0.0",
    },
    implementation: {
      description: "MEDICOBOT AI-Powered Hospital OPD Voice Triage Kiosk — FHIR Interoperability Facade",
    },
    fhirVersion: "4.0.1",
    format: ["application/fhir+json", "json"],
    rest: [
      {
        mode: "server",
        resource: [
          {
            type: "Patient",
            interaction: [{ code: "read" }, { code: "create" }],
            searchParam: [],
          },
          {
            type: "Observation",
            interaction: [{ code: "read" }, { code: "create" }, { code: "search-type" }],
            searchParam: [
              {
                name: "patient",
                type: "reference",
                documentation: "Search observations by subject patient id",
              },
            ],
          },
          {
            type: "DiagnosticReport",
            interaction: [{ code: "read" }, { code: "create" }, { code: "search-type" }],
            searchParam: [
              {
                name: "patient",
                type: "reference",
                documentation: "Search diagnostic reports by subject patient id",
              },
            ],
          },
          {
            type: "CarePlan",
            interaction: [{ code: "read" }, { code: "create" }, { code: "search-type" }],
            searchParam: [
              {
                name: "patient",
                type: "reference",
                documentation: "Search care plans by subject patient id",
              },
            ],
          },
        ],
      },
    ],
  } as const;
}
