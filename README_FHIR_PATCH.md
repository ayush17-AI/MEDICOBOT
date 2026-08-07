# FHIR R4 Interoperability Layer (append this section to README.md)

> Append everything below the divider into your existing `README.md`.
> No existing README content, and no frontend code, is modified.

---

## 🔗 FHIR R4 Interoperability Facade

MEDICOBOT exposes a standards-compliant **HL7 FHIR R4** API alongside the
existing product UI. It is implemented as an isolated **gateway / adapter
layer** — it does not alter the frontend, the existing app data model, or
any Supabase schema. All FHIR-specific code lives under `/fhir` and
`/app/api/fhir/`.

### Architecture

```
Supabase (source of truth)
        │
        ▼
fhir/data/repository.ts        ← single choke point for all DB access
        │
        ▼
fhir/transformers/*.ts         ← ToFHIR() / FromFHIR() bi-directional adapters
        │
        ▼
fhir/middleware/fhirValidator.ts  ← structural validation, OperationOutcome errors
        │
        ▼
app/api/fhir/**/route.ts       ← REST endpoints, application/fhir+json
```

Nothing outside `/fhir` and `/app/api/fhir` was touched. The existing
kiosk/dashboard UI, components, and Supabase tables are untouched — the
gateway reads/writes through `fhir/data/repository.ts`, which is the only
file that needs project-specific wiring (see below).

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/fhir/metadata` | FHIR `CapabilityStatement` |
| `GET` | `/fhir/Patient/:id` | Fetch a patient as FHIR `Patient` |
| `POST` | `/fhir/Patient` | Create a patient from a FHIR `Patient` payload |
| `GET` | `/fhir/Observation?patient=:id` | FHIR `Bundle` (searchset) of vitals/symptoms |
| `POST` | `/fhir/Observation` | Create a vital/symptom from a FHIR `Observation` payload |
| `GET` | `/fhir/DiagnosticReport?patient=:id` | FHIR `Bundle` (searchset) of reports |
| `POST` | `/fhir/DiagnosticReport` | Create a report from a FHIR `DiagnosticReport` payload |
| `GET` | `/fhir/CarePlan?patient=:id` | FHIR `Bundle` (searchset) of care plans |
| `POST` | `/fhir/CarePlan` | Create a care plan from a FHIR `CarePlan` payload |

All responses use `Content-Type: application/fhir+json`. All errors are
returned as FHIR `OperationOutcome` resources, not generic JSON errors.

### Coding systems

| Vital | LOINC code |
|---|---|
| Blood pressure panel | `85354-9` (with `8480-6` systolic / `8462-4` diastolic components) |
| Heart rate | `8867-4` |
| SpO2 | `59408-5` |

Symptoms are modeled as `Observation` (category `survey`) with an optional
SNOMED CT coding when the app has already assigned one upstream.

### Validation

`fhir/middleware/fhirValidator.ts` enforces `Content-Type:
application/fhir+json`, parses the body, and runs structural validation
(required fields, reference shapes like `Patient/{id}`, ISO datetimes)
before any transformer or DB call runs. Failures return a FHIR
`OperationOutcome` with `severity`/`code`/`diagnostics`, at the correct
HTTP status (400/415), never a generic 500.

### ⚠️ One wiring step required

This layer was generated without visibility into the project's actual
Supabase schema (only config files were available at generation time).
**`fhir/data/repository.ts`** contains typed stub functions
(`getPatientById`, `createPatient`, `searchVitalsByPatient`,
`createVitalOrSymptom`, etc.) that currently throw a clear "not wired"
error. Replace each stub's body with the real `supabase.from('...')`
call against your actual tables/columns — field-name mapping notes are
inline in `fhir/types.ts`. No other file (transformers, routes,
validator, tests) needs to change.

### Tests

```bash
npm install --save-dev vitest
npx vitest run
```

`tests/fhir/` covers: transformer round-trips (Patient, Observation incl.
LOINC codes, DiagnosticReport, CarePlan), structural validation
(accept/reject cases), the `/fhir/metadata` CapabilityStatement shape, and
route-level status codes (200/201/400/404/415) for Patient and Observation
endpoints via mocked repository calls.
