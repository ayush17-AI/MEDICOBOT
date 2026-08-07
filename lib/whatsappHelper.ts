export interface WhatsAppDetails {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}

export function sanitizeIndianPhone(phone: string, countryCode: string = '91'): string {
  // 1. Extract only digits
  let digits = phone.replace(/\D/g, '');
  let code = countryCode.replace(/\D/g, '') || '91';

  // 2. Remove duplicate leading country code if present (e.g. 919461112639 -> 9461112639)
  if (digits.length > 10 && digits.startsWith(code)) {
    digits = digits.slice(code.length);
  }

  // 3. Take last 10 digits
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  // Return clean full phone without spaces or symbols
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

Please arrive on time. Wish you good health!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
}

export function generateWhatsAppLink(details: WhatsAppDetails): string {
  return generateDirectWhatsAppUrl(details);
}
