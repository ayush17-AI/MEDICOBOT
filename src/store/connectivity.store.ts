import type { OfflineDispatchJob } from "@/src/models/alert.model";

type OnlineListener = () => void;

/**
 * Tracks online/offline connectivity for the alert pipeline and holds
 * an in-memory FIFO queue of dispatch jobs that couldn't be sent while
 * offline. When connectivity returns, registered listeners (AlertService
 * wires itself up as one) are notified so the queue can be flushed and
 * replayed in original order.
 *
 * Hackathon-scope: in-memory only. Swap for a SQLite-backed queue by
 * reimplementing this class's storage with the same public surface.
 */
class ConnectivityStore {
  private online = true;
  private readonly offlineQueue: OfflineDispatchJob[] = [];
  private readonly onOnlineListeners: OnlineListener[] = [];

  isOnline(): boolean {
    return this.online;
  }

  setOnline(next: boolean): void {
    const wasOffline = !this.online;
    this.online = next;

    if (next && wasOffline) {
      for (const listener of this.onOnlineListeners) listener();
    }
  }

  /** Register a callback fired whenever connectivity transitions
   *  offline -> online (used by AlertService to trigger a flush). */
  onOnline(listener: OnlineListener): void {
    this.onOnlineListeners.push(listener);
  }

  enqueue(job: OfflineDispatchJob): void {
    this.offlineQueue.push(job);
  }

  /** Drains the entire queue in FIFO order for replay. */
  drainAll(): OfflineDispatchJob[] {
    return this.offlineQueue.splice(0, this.offlineQueue.length);
  }

  peekAll(): OfflineDispatchJob[] {
    return [...this.offlineQueue];
  }

  resetForTest(): void {
    this.online = true;
    this.offlineQueue.length = 0;
    this.onOnlineListeners.length = 0;
  }
}

export const connectivityStore = new ConnectivityStore();
