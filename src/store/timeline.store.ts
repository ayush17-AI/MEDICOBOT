export type TimelineEventType = 
  | 'CONSULTATION' 
  | 'SYMPTOM_DETECTED' 
  | 'VITALS_SUBMITTED' 
  | 'ALERT_DISPATCHED' 
  | 'FILE_UPLOAD' 
  | 'DOSING_EVENT';

export interface TimelineEvent {
  id: string;
  patientId: string;
  eventType: TimelineEventType;
  summary: string;
  details?: Record<string, any>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

class TimelineStore {
  private events: TimelineEvent[] = [];

  // Append-only: New events added with timestamp and unique ID
  public addEvent(event: Omit<TimelineEvent, 'id' | 'timestamp'>): TimelineEvent {
    const newEvent: TimelineEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(newEvent); // Latest events first
    return newEvent;
  }

  // Read: Get chronologically sorted events by patient ID
  public getPatientEvents(patientId: string): TimelineEvent[] {
    return this.events.filter((e) => e.patientId === patientId);
  }

  // Read: Get all events
  public getAllEvents(): TimelineEvent[] {
    return this.events;
  }
}

export const timelineStore = new TimelineStore();
