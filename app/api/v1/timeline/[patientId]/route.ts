import { NextResponse } from 'next/server';
import { timelineStore } from '@/src/store/timeline.store';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const events = timelineStore.getPatientEvents(patientId);
    return NextResponse.json({ success: true, patientId, count: events.length, events }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve timeline events' }, { status: 500 });
  }
}
