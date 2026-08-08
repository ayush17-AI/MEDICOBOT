import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, patientName, riskScore, primarySymptom } = await req.json();

    if (!to || !patientName) {
      return NextResponse.json({ error: 'Missing phone number or patient name' }, { status: 400 });
    }

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      console.warn('[SMS API] FAST2SMS_API_KEY missing in environment variables');
      return NextResponse.json({ success: false, message: 'SMS API Key not configured' }, { status: 500 });
    }

    // Clean phone number (ensure strictly 10 digits for Fast2SMS)
    const cleanPhone = to.replace(/[^0-9]/g, '').slice(-10);

    const messageText = `CRITICAL MEDICAL ALERT: Patient ${patientName} is at HIGH RISK (Risk Score: ${riskScore}/100) due to ${primarySymptom || 'acute symptoms'}. Please check immediately.`;

    // Fast2SMS API Call
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message: messageText,
        language: 'english',
        flash: 0,
        numbers: cleanPhone,
      }),
    });

    const data = await response.json();
    console.log('[FAST2SMS RESPONSE]', data);

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('[SMS DISPATCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to dispatch SMS' }, { status: 500 });
  }
}
