import { NextResponse } from 'next/server';
import { timelineStore } from '@/src/store/timeline.store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, eventType, summary, details, severity } = body;

    if (!patientId || !eventType || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, eventType, and summary are required.' },
        { status: 400 }
      );
    }

    const event = timelineStore.addEvent({
      patientId,
      eventType,
      summary,
      details: details || {},
      severity: severity || 'LOW',
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to persist timeline event' }, { status: 500 });
  }
}
