import { describe, it, expect } from 'vitest';
import { TRIAGE_LEGAL_DISCLAIMER, attachDisclaimerToPayload } from '../src/compliance/disclaimer/triageDisclaimer';
import { sendWhatsAppClinicalGuidance } from '../src/services/whatsapp/whatsappService';

describe('Legal & Compliance Verification', () => {
  it('should attach mandatory legal disclaimer string to triage payloads', () => {
    const payload = attachDisclaimerToPayload({ riskScore: 85 });
    expect(payload.meta.legal_disclaimer).toBe(TRIAGE_LEGAL_DISCLAIMER);
    expect(payload.meta.timestamp).toBeDefined();
  });

  it('should format and queue WhatsApp clinical guidance notifications cleanly', async () => {
    const res = await sendWhatsAppClinicalGuidance({
      patientName: 'Test Patient',
      phoneNumber: '+919876543210',
      followUpStatus: 'In Progress',
      clinicianNote: 'Rest and fluids',
    });
    expect(res.success).toBe(true);
    expect(res.status).toBe('QUEUED_OR_DELIVERED');
  });
});
