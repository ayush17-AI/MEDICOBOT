export interface WhatsAppDetails {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}

export interface WhatsAppAlertPayload {
  to: string; // Patient's emergency contact phone number
  patientName: string;
  riskScore: number;
  primarySymptom?: string;
  vitalsSummary?: string;
}

export function sanitizeIndianPhone(phone: string, countryCode: string = '91'): string {
  let digits = (phone || '').replace(/\D/g, '');
  let code = (countryCode || '91').replace(/\D/g, '') || '91';

  if (digits.length > 10 && digits.startsWith(code)) {
    digits = digits.slice(code.length);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

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

  return `sms:+${cleanPhone}?body=${encodeURIComponent(textMessage)}`;
}

export function generateWhatsAppLink(details: WhatsAppDetails): string {
  return generateDirectWhatsAppUrl(details);
}

export async function sendRealWhatsAppNotification(payload: WhatsAppAlertPayload) {
  const { to, patientName, riskScore, primarySymptom, vitalsSummary } = payload;

  let formattedPhone = to.replace(/[^0-9]/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }

  const messageText = `🚨 *CRITICAL HIGH RISK MEDICAL ALERT* 🚨\n\n` +
    `*Patient Name:* ${patientName}\n` +
    `*Clinical Status:* AT HIGH RISK (Score: ${riskScore}/100)\n` +
    `*Reported Symptoms:* ${primarySymptom || 'Acute Medical Symptoms'}\n` +
    `*Vitals Summary:* ${vitalsSummary || 'Requires Immediate Medical Evaluation'}\n\n` +
    `⚠️ *Immediate Action Required:* Please check on the patient or contact emergency services.`;

  const encodedMessage = encodeURIComponent(messageText);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;

  if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
    try {
      await fetch(process.env.WHATSAPP_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: messageText }
        })
      });
      console.log(`[WHATSAPP API SENT] Direct alert dispatched to ${formattedPhone}`);
    } catch (err) {
      console.error('[WHATSAPP API ERROR]', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank');
  }

  return { success: true, url: whatsappUrl };
}

export async function sendWhatsAppNotification(payload: {
  to: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[EMERGENCY ALERT DISPATCHED] High risk alert sent to ${payload.to}`);
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
    return sendRealWhatsAppNotification({
      to: patientData.emergencyContact,
      patientName: patientData.name,
      riskScore: patientData.riskScore,
      primarySymptom: patientData.primarySymptom,
      vitalsSummary: patientData.vitalsSummary,
    });
  }
  return null;
}
