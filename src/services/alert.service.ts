import { randomUUID } from "crypto";
import type {
  AlertPayload,
  AlertRecord,
  AlertStatus,
  ChannelDispatchRecord,
  DispatchChannel,
  EscalationTarget,
  OfflineDispatchJob,
  SeverityLevel,
} from "@/src/models/alert.model";
import {
  createDefaultAdapters,
  type NotificationAdapter,
  type NotificationSendResult,
} from "@/src/services/notification-adapters";
import { alertStore } from "@/src/store/alert.store";
import { connectivityStore } from "@/src/store/connectivity.store";

/** Severity -> Channel Matrix (Section 2A of the spec). */
const SEVERITY_CHANNEL_MATRIX: Record<SeverityLevel, DispatchChannel[]> = {
  LOW: ["IN_APP_BADGE"],
  MODERATE: ["IN_APP_BADGE", "EMAIL"],
  HIGH: ["IN_APP_BADGE", "EMAIL", "PUSH_NOTIFICATION"],
  CRITICAL: ["IN_APP_BADGE", "EMAIL", "PUSH_NOTIFICATION", "SMS_CRITICAL"],
};

/** Only HIGH/CRITICAL alerts run an escalation timer, per spec ("When
 *  a patient hits HIGH or CRITICAL risk status..."). Default critical
 *  timeout matches the spec's 300s; HIGH gets a longer, still-explicit
 *  default and both are overridable per-dispatch via the route/service. */
const DEFAULT_ESCALATION_TIMEOUT_MS: Partial<Record<SeverityLevel, number>> = {
  CRITICAL: 300_000, // 5 minutes
  HIGH: 600_000, // 10 minutes
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000; // 1s, 2s, 4s

type DelayFn = (ms: number) => Promise<void>;
type SchedulerSetFn = (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
type SchedulerClearFn = (handle: ReturnType<typeof setTimeout>) => void;

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Resolves a mock delivery address for a channel. In a wired system
 *  this would look up the patient's/caregiver's actual contact record
 *  (Supabase, etc.) — same "single integration seam" pattern as
 *  fhir/data/repository.ts uses for its stubs. */
function resolveTarget(patientId: string, channel: DispatchChannel): string {
  return `${channel.toLowerCase()}:${patientId}`;
}

export interface AlertServiceOptions {
  adapters?: Record<DispatchChannel, NotificationAdapter>;
  maxRetries?: number;
  baseDelayMs?: number;
  delayFn?: DelayFn;
  scheduleTimer?: SchedulerSetFn;
  clearTimer?: SchedulerClearFn;
  escalationTimeoutMs?: Partial<Record<SeverityLevel, number>>;
}

/**
 * Background alert worker: turns a risk evaluation into channel
 * dispatches, tracks each alert through its lifecycle state machine,
 * retries failed sends with exponential backoff, and escalates
 * unacknowledged HIGH/CRITICAL alerts to a secondary contact.
 *
 * All timing (retries + escalation) is timer/promise-based, so nothing
 * here blocks the Node.js event loop.
 */
export class AlertService {
  private readonly adapters: Record<DispatchChannel, NotificationAdapter>;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly delay: DelayFn;
  private readonly scheduleTimer: SchedulerSetFn;
  private readonly clearTimer: SchedulerClearFn;
  private readonly escalationTimeoutMs: Partial<Record<SeverityLevel, number>>;

  /** alertId -> pending escalation timer handle. */
  private readonly escalationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: AlertServiceOptions = {}) {
    this.adapters = options.adapters ?? createDefaultAdapters();
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.delay = options.delayFn ?? defaultDelay;
    this.scheduleTimer = options.scheduleTimer ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle));
    this.escalationTimeoutMs = {
      ...DEFAULT_ESCALATION_TIMEOUT_MS,
      ...options.escalationTimeoutMs,
    };

    // Replay anything cached while offline as soon as connectivity returns.
    connectivityStore.onOnline(() => {
      void this.flushOfflineQueue();
    });
  }

  /** Maps a severity tier to its required dispatch channels. Exposed
   *  as a pure static helper so it's independently unit-testable. */
  static channelsForSeverity(severity: SeverityLevel): DispatchChannel[] {
    return SEVERITY_CHANNEL_MATRIX[severity];
  }

  /**
   * Entry point: POST /alerts/dispatch lands here.
   * Idempotent when `idempotencyKey` is supplied — a repeat call with
   * the same key returns the original alert untouched rather than
   * re-running the pipeline.
   */
  async dispatch(payload: AlertPayload): Promise<AlertRecord> {
    if (!payload.patientId || payload.patientId.trim().length === 0) {
      throw new Error("AlertPayload.patientId is required");
    }

    if (payload.idempotencyKey) {
      const existing = alertStore.getByIdempotencyKey(payload.idempotencyKey);
      if (existing) return existing;
    }

    const channels = AlertService.channelsForSeverity(payload.category);
    const createdAt = nowIso();

    const alert: AlertRecord = {
      id: randomUUID(),
      patientId: payload.patientId,
      severity: payload.category,
      riskScore: payload.riskScore,
      message:
        payload.message ??
        `Patient ${payload.patientId} flagged ${payload.category} risk (score ${payload.riskScore}).`,
      channels: channels.map((channel) => ({
        channel,
        status: "PENDING",
        attempts: 0,
      })),
      status: "QUEUED",
      timeline: [{ status: "QUEUED", timestamp: createdAt, note: "Alert queued for dispatch" }],
      createdAt,
      escalationTarget: payload.escalationTarget,
      escalationTimeoutMs: this.escalationTimeoutMs[payload.category] ?? 0,
      factors: payload.factors,
      idempotencyKey: payload.idempotencyKey,
    };

    alertStore.save(alert);

    if (!connectivityStore.isOnline()) {
      this.queueOffline(alert);
      return alert;
    }

    return this.runDispatchPipeline(alert);
  }

  /** Doctor/caregiver acknowledgement. Idempotent: acknowledging an
   *  already-acknowledged alert just returns it unchanged. */
  async acknowledge(alertId: string, acknowledgedBy: string): Promise<AlertRecord | undefined> {
    const alert = alertStore.getById(alertId);
    if (!alert) return undefined;

    if (alert.status === "ACKNOWLEDGED") return alert;

    this.clearEscalationTimer(alertId);

    alert.status = "ACKNOWLEDGED";
    alert.acknowledgedAt = nowIso();
    alert.acknowledgedBy = acknowledgedBy;
    alert.timeline.push({
      status: "ACKNOWLEDGED",
      timestamp: alert.acknowledgedAt,
      note: `Acknowledged by ${acknowledgedBy}`,
    });

    return alertStore.save(alert);
  }

  getStatus(alertId: string): AlertRecord | undefined {
    return alertStore.getById(alertId);
  }

  getActive(): AlertRecord[] {
    return alertStore.getActive();
  }

  // ---------------------------------------------------------------------
  // Internal pipeline
  // ---------------------------------------------------------------------

  private queueOffline(alert: AlertRecord): void {
    const queuedAt = nowIso();
    for (const record of alert.channels) {
      const job: OfflineDispatchJob = {
        alertId: alert.id,
        channel: record.channel,
        target: resolveTarget(alert.patientId, record.channel),
        message: alert.message,
        queuedAt,
      };
      connectivityStore.enqueue(job);
    }
    alert.timeline.push({
      status: "QUEUED",
      timestamp: queuedAt,
      note: "Connectivity offline — channels cached for sync",
    });
    alertStore.save(alert);
  }

  /** Replays every cached offline job, in original order, once the
   *  connectivity store reports back online. */
  async flushOfflineQueue(): Promise<void> {
    const jobs = connectivityStore.drainAll();

    for (const job of jobs) {
      const alert = alertStore.getById(job.alertId);
      if (!alert) continue;

      const record = alert.channels.find((c) => c.channel === job.channel);
      if (!record) continue;

      await this.dispatchChannel(alert, record, job.target);
      alertStore.save(alert);
    }

    // Any alerts whose channels are now all attempted should have
    // their overall status/escalation finalized.
    const touchedAlertIds = new Set(jobs.map((j) => j.alertId));
    for (const alertId of touchedAlertIds) {
      const alert = alertStore.getById(alertId);
      if (alert && alert.status === "QUEUED") {
        this.finalizeDispatch(alert);
      }
    }
  }

  private async runDispatchPipeline(alert: AlertRecord): Promise<AlertRecord> {
    alert.status = "SENT";
    alert.timeline.push({
      status: "SENT",
      timestamp: nowIso(),
      note: `Dispatch initiated across ${alert.channels.length} channel(s)`,
    });
    alertStore.save(alert);

    await Promise.all(
      alert.channels.map((record) =>
        this.dispatchChannel(alert, record, resolveTarget(alert.patientId, record.channel))
      )
    );

    this.finalizeDispatch(alert);
    return alertStore.save(alert);
  }

  /** Sends (with retry/backoff) a single channel and updates its
   *  ChannelDispatchRecord in place. */
  private async dispatchChannel(
    alert: AlertRecord,
    record: ChannelDispatchRecord,
    target: string
  ): Promise<void> {
    const adapter = this.adapters[record.channel];
    const { result, attempts } = await this.sendWithRetry(adapter, target, alert.message);

    record.attempts = attempts;
    record.lastAttemptAt = nowIso();

    if (result.success) {
      record.status = "DELIVERED";
      record.deliveredAt = record.lastAttemptAt;
      record.error = undefined;
    } else {
      record.status = "FAILED";
      record.error = result.error ?? "Unknown delivery failure";
    }
  }

  /** Up to `maxRetries` retries (maxRetries+1 total attempts) with
   *  exponential backoff: 1s, 2s, 4s between attempts by default. */
  private async sendWithRetry(
    adapter: NotificationAdapter,
    target: string,
    message: string
  ): Promise<{ result: NotificationSendResult; attempts: number }> {
    let attempts = 0;
    let result: NotificationSendResult;

    while (true) {
      attempts++;
      result = await adapter.send(target, message);

      if (result.success) return { result, attempts };
      if (attempts > this.maxRetries) return { result, attempts };

      const backoffMs = this.baseDelayMs * Math.pow(2, attempts - 1);
      await this.delay(backoffMs);
    }
  }

  /** Rolls per-channel outcomes up into the alert's overall status and
   *  (for HIGH/CRITICAL alerts with at least one successful channel)
   *  arms the escalation timer. */
  private finalizeDispatch(alert: AlertRecord): void {
    const anyDelivered = alert.channels.some((c) => c.status === "DELIVERED");
    const finalStatus: AlertStatus = anyDelivered ? "DELIVERED" : "FAILED";

    alert.status = finalStatus;
    alert.timeline.push({
      status: finalStatus,
      timestamp: nowIso(),
      note: anyDelivered
        ? "At least one channel confirmed delivery"
        : "All channels failed after exhausting retries",
    });

    const escalates = alert.escalationTimeoutMs > 0 && anyDelivered;
    if (escalates) {
      this.scheduleEscalation(alert);
    }

    alertStore.save(alert);
  }

  private scheduleEscalation(alert: AlertRecord): void {
    this.clearEscalationTimer(alert.id);

    const handle = this.scheduleTimer(() => {
      void this.escalate(alert.id);
    }, alert.escalationTimeoutMs);

    this.escalationTimers.set(alert.id, handle);
  }

  private clearEscalationTimer(alertId: string): void {
    const handle = this.escalationTimers.get(alertId);
    if (handle) {
      this.clearTimer(handle);
      this.escalationTimers.delete(alertId);
    }
  }

  /** Fires when an alert's escalation timeout elapses unacknowledged. */
  private async escalate(alertId: string): Promise<void> {
    this.escalationTimers.delete(alertId);

    const alert = alertStore.getById(alertId);
    if (!alert) return;
    if (alert.status === "ACKNOWLEDGED") return; // race-safe: already handled

    alert.status = "ESCALATED";
    alert.escalatedAt = nowIso();
    alert.timeline.push({
      status: "ESCALATED",
      timestamp: alert.escalatedAt,
      note: "Acknowledgement timeout elapsed",
    });

    const target: EscalationTarget | undefined = alert.escalationTarget;

    if (!target) {
      alert.timeline.push({
        status: "ESCALATED",
        timestamp: nowIso(),
        note: "No escalation target configured — alert remains ESCALATED",
      });
      alertStore.save(alert);
      return;
    }

    const adapter = this.adapters[target.contactChannel];
    const { result } = await this.sendWithRetry(adapter, target.contactAddress, alert.message);

    alert.timeline.push({
      status: "ESCALATED",
      timestamp: nowIso(),
      note: result.success
        ? `Dispatched to secondary contact ${target.name} (${target.role}) via ${target.contactChannel}`
        : `Secondary contact dispatch to ${target.name} failed: ${result.error ?? "unknown error"}`,
    });

    alertStore.save(alert);
  }
}

/** Shared singleton so every route handler in the process dispatches
 *  through the same worker instance (and thus the same escalation
 *  timers / offline queue wiring). */
export const alertService = new AlertService();
