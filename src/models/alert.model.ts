/**
 * Module 3: Background Alert & Escalation Pipeline
 * Domain models / type contracts.
 *
 * Backward-compatible with Module 4's risk evaluation payloads:
 * SeverityLevel mirrors Module 4's RiskTier exactly, and RiskFactor is
 * re-exported so an AlertPayload can carry a Module 4 evaluation
 * result straight through without any field remapping.
 */
import type { RiskFactor, RiskTier } from "@/src/models/risk.model";

export type { RiskFactor };

/** Alias of Module 4's RiskTier — kept as its own named type here so
 *  Module 3 can be read/reasoned about independently of Module 4. */
export type SeverityLevel = RiskTier;

export type DispatchChannel =
  | "IN_APP_BADGE"
  | "EMAIL"
  | "PUSH_NOTIFICATION"
  | "SMS_CRITICAL";

export type AlertStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "ACKNOWLEDGED"
  | "ESCALATED"
  | "FAILED";

export type ChannelDispatchStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";

/** Secondary contact an alert escalates to if unacknowledged in time. */
export interface EscalationTarget {
  id: string;
  name: string;
  role: string;
  contactChannel: DispatchChannel;
  contactAddress: string;
}

/** Inbound request to dispatch a new alert — typically fed directly
 *  from a Module 4 RiskEvaluationResult. */
export interface AlertPayload {
  patientId: string;
  riskScore: number;
  category: SeverityLevel;
  message?: string;
  factors?: RiskFactor[];
  escalationTarget?: EscalationTarget;
  /** Optional caller-supplied dedupe key (e.g. Module 4's evaluatedAt
   *  timestamp + patientId). Re-dispatching the same key returns the
   *  existing alert unchanged instead of creating a duplicate pipeline
   *  run — this is what makes POST /alerts/dispatch idempotent. */
  idempotencyKey?: string;
}

export interface AlertTimelineEvent {
  status: AlertStatus;
  timestamp: string;
  note?: string;
}

/** Per-channel dispatch bookkeeping, including retry attempt count. */
export interface ChannelDispatchRecord {
  channel: DispatchChannel;
  status: ChannelDispatchStatus;
  attempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  error?: string;
}

export interface AlertRecord {
  id: string;
  patientId: string;
  severity: SeverityLevel;
  riskScore: number;
  message: string;
  channels: ChannelDispatchRecord[];
  status: AlertStatus;
  timeline: AlertTimelineEvent[];
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  escalatedAt?: string;
  escalationTarget?: EscalationTarget;
  escalationTimeoutMs: number;
  factors?: RiskFactor[];
  idempotencyKey?: string;
}

/** A single queued (offline-cached) dispatch job for one channel of
 *  one alert, replayed in order once connectivity returns. */
export interface OfflineDispatchJob {
  alertId: string;
  channel: DispatchChannel;
  target: string;
  message: string;
  queuedAt: string;
}
