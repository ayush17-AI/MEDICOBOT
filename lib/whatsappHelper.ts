export interface WhatsAppDetails {
  patientName: string;
  phoneNumber: string;
  countryCode?: string;
  appointmentDate: string;
  tokenNumber?: string;
  doctorName?: string;
}

export function generateWhatsAppLink(details: WhatsAppDetails): string {
  const cleanCode = (details.countryCode || '91').replace(/\D/g, '');
  const cleanPhone = details.phoneNumber.replace(/\D/g, '');
  const fullPhone = `${cleanCode}${cleanPhone}`;

  const message = `🏥 *MEDICOBOT OPD Confirmation*

Hello *${details.patientName}*,
Your appointment has been successfully scheduled!

📅 *Date:* ${details.appointmentDate}
🎫 *Token No:* ${details.tokenNumber || '#MED-1150'}
👨‍⚕️ *Doctor:* ${details.doctorName || 'General Physician'}

Please reach Room 204 on time. Wish you good health!`;

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
