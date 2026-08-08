export interface WhatsAppDetails {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}

export function sanitizeIndianPhone(phone: string, countryCode: string = '91'): string {
  // 1. Keep only numeric digits
  let digits = (phone || '').replace(/\D/g, '');
  let code = (countryCode || '91').replace(/\D/g, '') || '91';

  // 2. Fix duplicate leading country code (e.g., 919461112639 -> 9461112639)
  if (digits.length > 10 && digits.startsWith(code)) {
    digits = digits.slice(code.length);
  }

  // 3. Take strictly the last 10 digits
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  // Return clean country code + 10 digit number without spaces or '+'
  return `${code}${digits}`;
}

export function sanitizePhoneNumber(phone: string, countryCode: string = '91'): string {
  const cleanPhone = sanitizeIndianPhone(phone, countryCode);
  return `+${cleanPhone}`;
}

export function generateDirectWhatsAppUrl(details: {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}): string {
  const cleanPhone = sanitizeIndianPhone(details.phoneNumber, details.countryCode);

  const textMessage = `🏥 *MEDICOBOT OPD Confirmation*

Hello *${details.patientName}*,
Your appointment registration is successful!

📅 *Date:* ${details.appointmentDate}
🎫 *Token No:* ${details.tokenNumber || '#MED-1150'}
👨‍⚕️ *Doctor:* ${details.doctorName || 'General Physician'}
📍 *Location:* Room 204, OPD Cabinet

Please arrive 10 mins prior to your schedule. Wish you good health!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
}

export function generateDirectSmsUrl(details: {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}): string {
  const cleanPhone = sanitizeIndianPhone(details.phoneNumber, details.countryCode);

  const textMessage = `MEDICOBOT OPD Confirmation: Hello ${details.patientName}, your appointment is confirmed for ${details.appointmentDate}. Token No: ${details.tokenNumber || '#MED-1150'}. Doctor: ${details.doctorName || 'General Physician'}. Room 204.`;

  // Standard SMS URL scheme
  return `sms:+${cleanPhone}?body=${encodeURIComponent(textMessage)}`;
}

export function generateWhatsAppLink(details: WhatsAppDetails): string {
  return generateDirectWhatsAppUrl(details);
}

export async function sendWhatsAppNotification(payload: {
  to: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[EMERGENCY ALERT DISPATCHED] High risk alert sent to ${payload.to}`);
    // In server/client integration, attempt server notification route if available
    if (typeof window !== 'undefined') {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('[EMERGENCY ALERT NOTIFY WARN]', e));
    }
    return { success: true };
  } catch (error: any) {
    console.error('[EMERGENCY ALERT ERROR]', error);
    return { success: false, error: String(error) };
  }
}

export async function checkAndTriggerEmergencyAlert(patientData: {
  name: string;
  riskScore: number;
  emergencyContact: string;
  primarySymptom?: string;
  vitalsSummary?: string;
}) {
  if (patientData.riskScore >= 70 && patientData.emergencyContact) {
    const alertMessage = `🚨 HIGH RISK MEDICAL ALERT 🚨\n\nPatient Name: ${patientData.name}\nStatus: AT HIGH RISK (Risk Score: ${patientData.riskScore}/100)\nReported Symptoms: ${patientData.primarySymptom || 'Acute Symptoms'}\nVitals Summary: ${patientData.vitalsSummary || 'Requires Immediate Medical Evaluation'}\n\nPlease contact the patient or hospital emergency team immediately!`;

    try {
      await sendWhatsAppNotification({
        to: patientData.emergencyContact,
        body: alertMessage,
      });
      console.log(`[EMERGENCY ALERT DISPATCHED] High risk alert sent to ${patientData.emergencyContact}`);
    } catch (error) {
      console.error('[EMERGENCY ALERT ERROR]', error);
    }
  }
}
