/**
 * fhir/utils/operationOutcome.ts
 * Builds FHIR R4-conformant OperationOutcome error bodies.
 */

export type OperationOutcomeSeverity = "fatal" | "error" | "warning" | "information";
export type OperationOutcomeCode =
  | "invalid"
  | "structure"
  | "required"
  | "value"
  | "not-found"
  | "not-supported"
  | "exception"
  | "processing";

export interface FhirOperationOutcome {
  resourceType: "OperationOutcome";
  issue: Array<{
    severity: OperationOutcomeSeverity;
    code: OperationOutcomeCode;
    diagnostics?: string;
    expression?: string[];
  }>;
}

export function buildOperationOutcome(
  severity: OperationOutcomeSeverity,
  code: OperationOutcomeCode,
  diagnostics: string,
  expression?: string[]
): FhirOperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [
      {
        severity,
        code,
        diagnostics,
        ...(expression ? { expression } : {}),
      },
    ],
  };
}

/** Shortcut for the common "bad request body" case. */
export function invalidResource(diagnostics: string, expression?: string[]) {
  return buildOperationOutcome("error", "invalid", diagnostics, expression);
}

export function notFound(diagnostics: string) {
  return buildOperationOutcome("error", "not-found", diagnostics);
}

export function serverError(diagnostics: string) {
  return buildOperationOutcome("fatal", "exception", diagnostics);
}
