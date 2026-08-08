export interface WhatsAppNotificationPayload {
  patientName: string;
  phoneNumber: string;
  recheckupDate?: string;
  department?: string;
  clinicianNote?: string;
  followUpStatus?: string;
}

export async function sendWhatsAppClinicalGuidance(payload: WhatsAppNotificationPayload) {
  try {
    const messageBody = `Hello ${payload.patientName}, your care follow-up status has been updated to [${payload.followUpStatus || 'Updated'}]. Recommended re-checkup: ${payload.recheckupDate || 'As advised'} with ${payload.department || 'Attending Physician'}. Guidance: ${payload.clinicianNote || 'Follow standard care precautions.'} In case of worsening symptoms, visit the nearest ER immediately.`;

    console.log('[WHATSAPP SERVICE QUEUE]', { to: payload.phoneNumber, messageBody });

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && fromPhone) {
      const client = require('twilio')(accountSid, authToken);
      await client.messages.create({
        body: messageBody,
        from: `whatsapp:${fromPhone}`,
        to: `whatsapp:${payload.phoneNumber}`,
      });
    }

    return { success: true, status: 'QUEUED_OR_DELIVERED' };
  } catch (error) {
    console.error('[WHATSAPP SERVICE ERR]', error);
    return { success: false, error: 'Dispatch failed' };
  }
}
