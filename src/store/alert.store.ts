import type { AlertRecord } from "@/src/models/alert.model";

/**
 * In-memory alert store keyed by alertId, with a secondary index by
 * patientId for quick "active alerts for this patient" lookups.
 * Same scaling caveat as Module 4's triage.store.ts: fine for a single
 * process; swap for Supabase/Redis for multi-instance deployments.
 */
class AlertStore {
  private alerts = new Map<string, AlertRecord>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey -> alertId

  save(alert: AlertRecord): AlertRecord {
    this.alerts.set(alert.id, alert);
    if (alert.idempotencyKey) {
      this.idempotencyIndex.set(alert.idempotencyKey, alert.id);
    }
    return alert;
  }

  /** Returns the existing alert for this idempotency key, if any. */
  getByIdempotencyKey(idempotencyKey: string): AlertRecord | undefined {
    const alertId = this.idempotencyIndex.get(idempotencyKey);
    return alertId ? this.alerts.get(alertId) : undefined;
  }

  getById(alertId: string): AlertRecord | undefined {
    return this.alerts.get(alertId);
  }

  getAll(): AlertRecord[] {
    return Array.from(this.alerts.values());
  }

  getActive(): AlertRecord[] {
    return this.getAll().filter(
      (a) => a.status !== "ACKNOWLEDGED" && a.status !== "FAILED"
    );
  }

  getByPatientId(patientId: string): AlertRecord[] {
    return this.getAll().filter((a) => a.patientId === patientId);
  }

  clear(): void {
    this.alerts.clear();
    this.idempotencyIndex.clear();
  }
}

export const alertStore = new AlertStore();
