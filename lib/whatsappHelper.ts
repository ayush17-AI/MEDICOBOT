export interface WhatsAppDetails {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}

export function sanitizePhoneNumber(phone: string, countryCode: string = '91'): string {
  // 1. Keep only digits
  let cleanPhone = phone.replace(/\D/g, '');
  let cleanCode = countryCode.replace(/\D/g, '') || '91';

  // 2. If phone starts with the country code (e.g. 919461112639), strip the leading country code from phone
  if (cleanPhone.startsWith(cleanCode) && cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(cleanCode.length);
  }

  // 3. Return sanitized E.164 number format: +919461112639
  return `+${cleanCode}${cleanPhone}`;
}

export function generateWhatsAppLink(details: WhatsAppDetails): string {
  const sanitizedPhone = sanitizePhoneNumber(details.phoneNumber, details.countryCode || '91').replace(/\+/g, '');

  const message = `🏥 *MEDICOBOT OPD Confirmation*

Hello *${details.patientName}*,
Your appointment has been successfully scheduled!

📅 *Date:* ${details.appointmentDate}
🎫 *Token No:* ${details.tokenNumber || '#MED-1150'}
👨‍⚕️ *Doctor:* ${details.doctorName || 'General Physician'}

Please reach Room 204 on time. Wish you good health!`;

  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
}
