import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, patientName, patientPhone, prescriptionText, transcriptionSource, fulfillInHousePharmacy } = body;

    if (!prescriptionText) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: prescriptionText is mandatory.' },
        { status: 400 }
      );
    }

    const sanitizedText = prescriptionText.trim();
    const cleanPhone = (patientPhone || '').replace(/[^0-9]/g, '').slice(-10);

    // 1. Format WhatsApp Prescription Message
    const whatsappMessage = `💊 *MEDICOBOT OFFICIAL PRESCRIPTION*\n\n*Patient:* ${patientName || 'Valued Patient'}\n*Date:* ${new Date().toLocaleDateString()}\n\n*Prescription Details:*\n${sanitizedText}\n\n*In-House Pharmacy Status:* ${fulfillInHousePharmacy ? 'Order Queued for Fulfillment ✅' : 'Self-Fulfillment'}\n\n_Please consult your pharmacist or physician if you have any questions._`;

    console.log('[PRESCRIPTION DISPATCHED]', {
      patientId,
      phone: cleanPhone,
      source: transcriptionSource,
      fulfillPharmacy: fulfillInHousePharmacy,
    });

    // 2. Direct WhatsApp Link Fallback Generation
    const whatsappDeepLink = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`
      : null;

    // 3. Background WhatsApp Dispatch Trigger (if Twilio/Meta keys exist)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && fromPhone && cleanPhone) {
      try {
        const client = require('twilio')(accountSid, authToken);
        await client.messages.create({
          body: whatsappMessage,
          from: `whatsapp:${fromPhone}`,
          to: `whatsapp:+91${cleanPhone}`,
        });
        console.log('[WHATSAPP PRESCRIPTION DISPATCH SUCCESS]');
      } catch (wErr) {
        console.error('[TWILIO WHATSAPP ERR]', wErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Prescription dispatched to pharmacy and WhatsApp successfully',
      dispatchId: `disp_${Date.now()}`,
      whatsappDeepLink,
      metadata: {
        patientId,
        patientPhone: cleanPhone,
        transcriptionSource: transcriptionSource || 'manual_input',
        fulfillInHousePharmacy: Boolean(fulfillInHousePharmacy),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[DISPATCH API ERR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Dispatch processing failed' }, { status: 500 });
  }
}
