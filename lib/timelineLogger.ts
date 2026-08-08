import { timelineStore, TimelineEventType, TimelineEvent } from '@/src/store/timeline.store';

export async function logTimelineEvent(payload: {
  patientId: string;
  eventType: TimelineEventType;
  summary: string;
  details?: Record<string, any>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}): Promise<TimelineEvent | null> {
  try {
    // 1. Direct memory/store log
    const event = timelineStore.addEvent(payload);

    // 2. HTTP POST fallback to endpoint if client-side
    if (typeof window !== 'undefined') {
      fetch('/api/v1/timeline/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.error('[TIMELINE_HTTP_ERR]', err));
    }

    return event;
  } catch (err) {
    console.error('[TIMELINE_LOG_ERR]', err);
    return null;
  }
}
