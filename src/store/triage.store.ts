import type { TriageQueueItem } from "@/src/models/risk.model";

/**
 * In-memory triage queue.
 *
 * Hackathon-scope store: a single Map keyed by patientId. This is fine for
 * a single Next.js server process / dev deployment. For a multi-instance
 * production deployment, swap this module's implementation for a shared
 * store (Supabase table, Redis, etc.) — every route handler consumes it
 * only through the functions below, so that's the single place to change.
 */
class TriageQueueStore {
  private queue = new Map<string, TriageQueueItem>();

  upsert(item: TriageQueueItem): TriageQueueItem {
    const existing = this.queue.get(item.patientId);
    const merged: TriageQueueItem = existing
      ? { ...item, enqueuedAt: existing.enqueuedAt }
      : item;

    this.queue.set(item.patientId, merged);
    return merged;
  }

  getByPatientId(patientId: string): TriageQueueItem | undefined {
    return this.queue.get(patientId);
  }

  getAll(): TriageQueueItem[] {
    return Array.from(this.queue.values());
  }

  remove(patientId: string): boolean {
    return this.queue.delete(patientId);
  }
}

/** Module-level singleton so every route handler shares the same queue. */
export const triageQueueStore = new TriageQueueStore();
