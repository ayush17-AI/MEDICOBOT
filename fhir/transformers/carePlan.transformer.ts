/**
 * fhir/transformers/carePlan.transformer.ts
 * Bi-directional adapter: InternalCarePlan <-> FHIR R4 CarePlan
 */

import type { InternalCarePlan } from "../types";

export interface FhirCarePlan {
  resourceType: "CarePlan";
  id?: string;
  status: "draft" | "active" | "on-hold" | "revoked" | "completed" | "entered-in-error" | "unknown";
  intent: "proposal" | "plan" | "order" | "option";
  title: string;
  subject: { reference: string };
  created?: string;
  goal?: Array<{ reference?: string; display?: string }>;
  activity?: Array<{
    detail: { description: string; status: "not-started" | "in-progress" | "completed" };
  }>;
}

const STATUS_MAP: Record<
  NonNullable<InternalCarePlan["status"]>,
  FhirCarePlan["status"]
> = {
  draft: "draft",
  active: "active",
  completed: "completed",
  cancelled: "revoked",
};

export function toFhirCarePlan(plan: InternalCarePlan): FhirCarePlan {
  return {
    resourceType: "CarePlan",
    id: plan.id,
    status: plan.status ? STATUS_MAP[plan.status] : "active",
    intent: "plan",
    title: plan.title,
    subject: { reference: `Patient/${plan.patientId}` },
    created: plan.createdAt,
    ...(plan.goals && plan.goals.length > 0
      ? { goal: plan.goals.map((g) => ({ display: g })) }
      : {}),
    ...(plan.activities && plan.activities.length > 0
      ? {
          activity: plan.activities.map((a) => ({
            detail: { description: a, status: "not-started" as const },
          })),
        }
      : {}),
  };
}

export function fromFhirCarePlan(
  resource: FhirCarePlan
): Omit<InternalCarePlan, "id" | "createdAt"> {
  if (resource.resourceType !== "CarePlan") {
    throw new Error(
      `fromFhirCarePlan expected resourceType "CarePlan", got "${resource.resourceType}"`
    );
  }

  const patientId = resource.subject?.reference?.replace(/^Patient\//, "");
  if (!patientId) {
    throw new Error("FHIR CarePlan.subject.reference must be Patient/{id}");
  }
  if (!resource.title) {
    throw new Error("FHIR CarePlan.title is required");
  }

  const reverseStatus = (
    Object.entries(STATUS_MAP) as Array<
      [NonNullable<InternalCarePlan["status"]>, FhirCarePlan["status"]]
    >
  ).find(([, v]) => v === resource.status)?.[0];

  return {
    patientId,
    title: resource.title,
    goals: resource.goal?.map((g) => g.display ?? g.reference ?? "").filter(Boolean),
    activities: resource.activity?.map((a) => a.detail.description),
    status: reverseStatus,
  };
}
