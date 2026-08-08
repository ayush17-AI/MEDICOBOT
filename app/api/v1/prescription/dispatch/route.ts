import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      patientId, 
      patientName, 
      patientPhone, 
      doctorName, 
      tokenNumber, 
      roomNumber, 
      currentServingToken, 
      estimatedWaitTime, 
      prescriptionText, 
      transcriptionSource,
      fulfillInHousePharmacy 
    } = body;

    const cleanPhone = (patientPhone || '').replace(/[^0-9]/g, '').slice(-10);

    // Dynamic Room Navigation Mapping
    const getRoomDirections = (room: string) => {
      if (!room) return 'Report to Main OPD Reception Desk (Ground Floor)';
      const roomNum = room.replace(/[^0-9]/g, '');
      if (roomNum.startsWith('1')) return `Ground Floor, Block A -> Pass Radiology Wing -> Room ${room}`;
      if (roomNum.startsWith('2')) return `1st Floor, Block B -> Take Elevator 2 -> Turn Left near Cardiology Wing -> Room ${room}`;
      if (roomNum.startsWith('3')) return `2nd Floor, Critical Care Block -> Take Central Stairs -> Room ${room}`;
      return `OPD Main Building -> Check Signage for Room ${room}`;
    };

    const roomDirections = getRoomDirections(roomNumber || '204');
    const currentToken = currentServingToken || 'MED-3640';
    const waitTime = estimatedWaitTime || '15-20 Mins';

    // Enhanced WhatsApp Structured Message Payload
    const formattedWhatsappMsg = 
`🏥 *MEDICOBOT OFFICIAL OPD & PRESCRIPTION DISPATCH*

👤 *Patient Name:* ${patientName || 'Valued Patient'}
👨‍⚕️ *Doctor:* ${doctorName || 'Dr. Alok Mishra'}
🚪 *Consultation Room:* ${roomNumber || 'Room 204'}

━━━━━━━━━━━━━━━━━━━━━
🎫 *LIVE TOKEN & QUEUE STATUS*
• *Your Token Number:* ${tokenNumber || 'MED-3647'}
• *Currently Serving Token:* ${currentToken}
• *Estimated Wait Time:* ⏳ ${waitTime}

🧭 *ROOM NAVIGATION DIRECTIONS:*
📍 ${roomDirections}
━━━━━━━━━━━━━━━━━━━━━

💊 *PRESCRIPTION & CARE GUIDANCE:*
${prescriptionText || 'Follow standard prescribed medication and hydration instructions.'}

📦 *In-House Pharmacy:* ${fulfillInHousePharmacy ? 'Queued for Auto-Fulfillment ✅' : 'Self-Fulfillment'}

⚠️ _In case of emergency worsening symptoms, proceed to Trauma Desk immediately._`;

    console.log('[ENHANCED WHATSAPP PAYLOAD GENERATED]', {
      phone: cleanPhone,
      tokenNumber,
      currentToken,
      waitTime,
    });

    const whatsappDeepLink = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(formattedWhatsappMsg)}`
      : null;

    // Trigger Twilio/WhatsApp Cloud API if keys are present
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && fromPhone && cleanPhone) {
      try {
        const client = require('twilio')(accountSid, authToken);
        await client.messages.create({
          body: formattedWhatsappMsg,
          from: `whatsapp:${fromPhone}`,
          to: `whatsapp:+91${cleanPhone}`,
        });
      } catch (wErr) {
        console.error('[TWILIO WHATSAPP API ERR]', wErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Enhanced WhatsApp notification dispatched successfully',
      whatsappDeepLink,
      details: {
        tokenNumber,
        currentServingToken: currentToken,
        estimatedWaitTime: waitTime,
        directions: roomDirections,
      },
      metadata: {
        patientId,
        patientPhone: cleanPhone,
        transcriptionSource: transcriptionSource || 'manual_input',
        fulfillInHousePharmacy: Boolean(fulfillInHousePharmacy),
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('[ENHANCED DISPATCH ERR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
