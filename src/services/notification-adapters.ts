import type { DispatchChannel } from "@/src/models/alert.model";

export interface NotificationSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/** Contract every channel adapter (mock or real) must satisfy. */
export interface NotificationAdapter {
  send(target: string, message: string): Promise<NotificationSendResult>;
}

function fakeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Base mock adapter: resolves successfully after a short simulated
 *  latency. Real adapters (Twilio/SendGrid/FCM/etc.) implement the
 *  same NotificationAdapter interface and can be swapped in without
 *  touching AlertService. */
class BaseMockAdapter implements NotificationAdapter {
  constructor(
    private readonly providerPrefix: string,
    private readonly latencyMs = 25
  ) {}

  async send(target: string, message: string): Promise<NotificationSendResult> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    if (!target || target.trim().length === 0) {
      return { success: false, error: `No delivery address configured for ${this.providerPrefix}` };
    }

    return { success: true, providerMessageId: fakeId(this.providerPrefix) };
  }
}

export class MockInAppBadgeAdapter extends BaseMockAdapter {
  constructor() {
    super("inapp");
  }
}

export class MockEmailAdapter extends BaseMockAdapter {
  constructor() {
    super("email");
  }
}

export class MockPushNotificationAdapter extends BaseMockAdapter {
  constructor() {
    super("push");
  }
}

export class MockSmsCriticalAdapter extends BaseMockAdapter {
  constructor() {
    super("sms");
  }
}

/** Default registry AlertService uses in production/dev. Tests can
 *  construct AlertService with their own map (e.g. a flaky adapter
 *  that fails N times) to exercise the retry path deterministically. */
export function createDefaultAdapters(): Record<DispatchChannel, NotificationAdapter> {
  return {
    IN_APP_BADGE: new MockInAppBadgeAdapter(),
    EMAIL: new MockEmailAdapter(),
    PUSH_NOTIFICATION: new MockPushNotificationAdapter(),
    SMS_CRITICAL: new MockSmsCriticalAdapter(),
  };
}
