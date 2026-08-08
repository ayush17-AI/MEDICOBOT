declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => Promise<void> | void) => void;
declare const expect: (val: any) => { toBe: (expected: any) => void };

import { POST } from '../app/api/v1/prescription/dispatch/route';

describe('Prescription & Speech-to-Text Dispatch Pipeline', () => {
  it('should process prescription dispatch with speech_to_text metadata', async () => {
    const req = new Request('http://localhost/api/v1/prescription/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'PAT-101',
        prescriptionText: 'Amoxicillin 500mg TDS for 7 days',
        transcriptionSource: 'speech_to_text',
        fulfillInHousePharmacy: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.metadata.transcriptionSource).toBe('speech_to_text');
    expect(data.fhirResource.resourceType).toBe('MedicationRequest');
  });

  it('should return 400 bad request if prescriptionText is missing', async () => {
    const req = new Request('http://localhost/api/v1/prescription/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: 'PAT-101' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
