import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertService } from "@/src/services/alert.service";
import type { NotificationAdapter, NotificationSendResult } from "@/src/services/notification-adapters";
import type { DispatchChannel } from "@/src/models/alert.model";
import { alertStore } from "@/src/store/alert.store";
import { connectivityStore } from "@/src/store/connectivity.store";

/** Always-succeeds adapter, instant (no real setTimeout latency). */
class InstantSuccessAdapter implements NotificationAdapter {
  async send(): Promise<NotificationSendResult> {
    return { success: true, providerMessageId: "mock-id" };
  }
}

/** Fails the first `failCount` calls, then succeeds — used to exercise
 *  the retry/backoff path deterministically. */
class FlakyAdapter implements NotificationAdapter {
  private calls = 0;
  constructor(private readonly failCount: number) {}

  async send(): Promise<NotificationSendResult> {
    this.calls++;
    if (this.calls <= this.failCount) {
      return { success: false, error: `Simulated failure #${this.calls}` };
    }
    return { success: true, providerMessageId: "mock-id-after-retry" };
  }
}

class AlwaysFailAdapter implements NotificationAdapter {
  async send(): Promise<NotificationSendResult> {
    return { success: false, error: "Always fails" };
  }
}

function allChannelAdapters(adapter: NotificationAdapter | (() => NotificationAdapter)): Record<DispatchChannel, NotificationAdapter> {
  const getAdapter = typeof adapter === "function" ? (adapter as () => NotificationAdapter) : () => adapter;
  return {
    IN_APP_BADGE: getAdapter(),
    EMAIL: getAdapter(),
    PUSH_NOTIFICATION: getAdapter(),
    SMS_CRITICAL: getAdapter(),
  };
}

function noOpDelay(): Promise<void> {
  return Promise.resolve();
}

describe("AlertService.channelsForSeverity", () => {
  it("maps each tier to the exact channel set from the spec", () => {
    expect(AlertService.channelsForSeverity("LOW")).toEqual(["IN_APP_BADGE"]);
    expect(AlertService.channelsForSeverity("MODERATE")).toEqual(["IN_APP_BADGE", "EMAIL"]);
    expect(AlertService.channelsForSeverity("HIGH")).toEqual([
      "IN_APP_BADGE",
      "EMAIL",
      "PUSH_NOTIFICATION",
    ]);
    expect(AlertService.channelsForSeverity("CRITICAL")).toEqual([
      "IN_APP_BADGE",
      "EMAIL",
      "PUSH_NOTIFICATION",
      "SMS_CRITICAL",
    ]);
  });
});

describe("AlertService.dispatch", () => {
  beforeEach(() => {
    alertStore.clear();
    connectivityStore.resetForTest();
  });

  it("moves a fully-successful CRITICAL alert through QUEUED -> SENT -> DELIVERED", async () => {
    const service = new AlertService({
      adapters: allChannelAdapters(new InstantSuccessAdapter()),
      delayFn: noOpDelay,
    });

    const alert = await service.dispatch({
      patientId: "p1",
      riskScore: 90,
      category: "CRITICAL",
    });

    expect(alert.status).toBe("DELIVERED");
    expect(alert.channels).toHaveLength(4);
    expect(alert.channels.every((c) => c.status === "DELIVERED")).toBe(true);

    const statuses = alert.timeline.map((t) => t.status);
    expect(statuses).toEqual(["QUEUED", "SENT", "DELIVERED"]);
  });

  it("retries a flaky channel with exponential backoff and eventually delivers", async () => {
    const delays: number[] = [];
    const service = new AlertService({
      adapters: allChannelAdapters(() => new FlakyAdapter(2)),
      delayFn: async (ms) => {
        delays.push(ms);
      },
    });

    const alert = await service.dispatch({
      patientId: "p2",
      riskScore: 60,
      category: "HIGH",
    });

    expect(alert.status).toBe("DELIVERED");
    expect(alert.channels.every((c) => c.attempts === 3)).toBe(true);
    // Each of the 3 channels backs off 1s then 2s before succeeding on attempt 3.
    expect(delays.filter((d) => d === 1000).length).toBe(3);
    expect(delays.filter((d) => d === 2000).length).toBe(3);
  });

  it("marks an alert FAILED when every channel exhausts all retries", async () => {
    const service = new AlertService({
      adapters: allChannelAdapters(new AlwaysFailAdapter()),
      delayFn: noOpDelay,
      maxRetries: 3,
    });

    const alert = await service.dispatch({
      patientId: "p3",
      riskScore: 30,
      category: "MODERATE",
    });

    expect(alert.status).toBe("FAILED");
    expect(alert.channels.every((c) => c.status === "FAILED" && c.attempts === 4)).toBe(true);
  });

  it("caps retries at maxRetries+1 total attempts (default 4)", async () => {
    const adapter = new AlwaysFailAdapter();
    const spy = vi.spyOn(adapter, "send");
    const service = new AlertService({
      adapters: allChannelAdapters(adapter),
      delayFn: noOpDelay,
    });

    await service.dispatch({ patientId: "p4", riskScore: 10, category: "LOW" });
    // LOW => 1 channel (IN_APP_BADGE) => 4 total attempts
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it("is idempotent when the same idempotencyKey is reused", async () => {
    const service = new AlertService({
      adapters: allChannelAdapters(new InstantSuccessAdapter()),
      delayFn: noOpDelay,
    });

    const first = await service.dispatch({
      patientId: "p5",
      riskScore: 80,
      category: "CRITICAL",
      idempotencyKey: "eval-123",
    });
    const second = await service.dispatch({
      patientId: "p5",
      riskScore: 80,
      category: "CRITICAL",
      idempotencyKey: "eval-123",
    });

    expect(second.id).toBe(first.id);
  });
});

describe("AlertService escalation", () => {
  beforeEach(() => {
    alertStore.clear();
    connectivityStore.resetForTest();
  });

  it("schedules escalation for a delivered CRITICAL alert and fires it on timeout", async () => {
    let scheduledCallback: (() => void) | undefined;

    const service = new AlertService({
      adapters: allChannelAdapters(new InstantSuccessAdapter()),
      delayFn: noOpDelay,
      scheduleTimer: (cb) => {
        scheduledCallback = cb;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: () => {},
      escalationTimeoutMs: { CRITICAL: 300_000 },
    });

    const alert = await service.dispatch({
      patientId: "p6",
      riskScore: 95,
      category: "CRITICAL",
      escalationTarget: {
        id: "e1",
        name: "Dr. Secondary",
        role: "on-call physician",
        contactChannel: "SMS_CRITICAL",
        contactAddress: "sms:secondary",
      },
    });

    expect(alert.status).toBe("DELIVERED");
    expect(scheduledCallback).toBeDefined();

    // Fire the escalation timer manually.
    scheduledCallback!();
    await new Promise((r) => setTimeout(r, 0)); // flush the async escalate()

    const updated = service.getStatus(alert.id);
    expect(updated?.status).toBe("ESCALATED");
    expect(updated?.escalatedAt).toBeDefined();
  });

  it("does not escalate LOW/MODERATE alerts", async () => {
    let scheduleCalled = false;
    const service = new AlertService({
      adapters: allChannelAdapters(new InstantSuccessAdapter()),
      delayFn: noOpDelay,
      scheduleTimer: (cb, ms) => {
        scheduleCalled = true;
        return setTimeout(cb, ms);
      },
    });

    await service.dispatch({ patientId: "p7", riskScore: 15, category: "LOW" });
    expect(scheduleCalled).toBe(false);
  });

  it("acknowledge() clears a pending escalation timer", async () => {
    let cleared = false;
    const service = new AlertService({
      adapters: allChannelAdapters(new InstantSuccessAdapter()),
      delayFn: noOpDelay,
      scheduleTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
      clearTimer: () => {
        cleared = true;
      },
      escalationTimeoutMs: { HIGH: 600_000 },
    });

    const alert = await service.dispatch({ patientId: "p8", riskScore: 55, category: "HIGH" });
    await service.acknowledge(alert.id, "nurse-jane");

    expect(cleared).toBe(true);
    expect(service.getStatus(alert.id)?.status).toBe("ACKNOWLEDGED");
  });

  it("acknowledge() is idempotent", async () => {
    const service = new AlertService({
      adapters: allChannelAdapters(new InstantSuccessAdapter()),
      delayFn: noOpDelay,
    });

    const alert = await service.dispatch({ patientId: "p9", riskScore: 20, category: "LOW" });
    const first = await service.acknowledge(alert.id, "nurse-a");
    const second = await service.acknowledge(alert.id, "nurse-b");

    expect(first?.acknowledgedBy).toBe("nurse-a");
    expect(second?.acknowledgedBy).toBe("nurse-a"); // unchanged by the second call
  });
});

describe("AlertService offline queueing", () => {
  beforeEach(() => {
    alertStore.clear();
    connectivityStore.resetForTest();
  });

  it("queues channels instead of sending while offline, then flushes on reconnect", async () => {
    const adapter = new InstantSuccessAdapter();
    const spy = vi.spyOn(adapter, "send");

    const service = new AlertService({
      adapters: allChannelAdapters(adapter),
      delayFn: noOpDelay,
    });
    void service; // constructed to register the onOnline flush listener

    connectivityStore.setOnline(false);

    const alert = await service.dispatch({ patientId: "p10", riskScore: 40, category: "MODERATE" });
    expect(alert.status).toBe("QUEUED");
    expect(spy).not.toHaveBeenCalled();
    expect(connectivityStore.peekAll()).toHaveLength(2); // IN_APP_BADGE + EMAIL

    connectivityStore.setOnline(true);
    await new Promise((r) => setTimeout(r, 0)); // flush is fire-and-forget

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
