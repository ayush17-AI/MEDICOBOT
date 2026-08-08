import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, patientName, riskScore, primarySymptom } = body;

    if (!to || !patientName) {
      return NextResponse.json(
        { success: false, error: 'Missing recipient phone number or patient name' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FAST2SMS_API_KEY || 'oxqVYnXT2IWORgZiUeaK6Myzm9sCcGrbvwEP73uNlQLjHtFk0DOH2WylisDRPwcnU4VzCKpgraedLNG8';

    // Sanitize phone number to strictly 10 Indian digits
    const cleanPhone = to.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid 10-digit mobile number format' },
        { status: 400 }
      );
    }

    const messageText = `CRITICAL MEDICAL ALERT: Patient ${patientName} is at HIGH RISK (Score: ${riskScore || 85}/100) due to ${primarySymptom || 'acute symptoms'}. Please check immediately.`;

    // Fast2SMS Quick Send API Payload
    const fast2smsPayload = {
      route: 'q',
      message: messageText,
      language: 'english',
      flash: 0,
      numbers: cleanPhone,
    };

    console.log('[SMS DISPATCH INITIATED]', { cleanPhone, apiKeyLength: apiKey.length });

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fast2smsPayload),
    });

    const data = await response.json();
    console.log('[FAST2SMS API RESPONSE]', data);

    if (data && (data.return === true || data.status_code === 200)) {
      return NextResponse.json({ success: true, provider: 'Fast2SMS', result: data });
    } else {
      console.warn('[FAST2SMS WARNING]', data);
      return NextResponse.json(
        { success: false, provider: 'Fast2SMS', result: data, fallbackUri: `sms:+91${cleanPhone}?body=${encodeURIComponent(messageText)}` },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('[SMS DISPATCH SERVER ERR]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'SMS Dispatch Failed' },
      { status: 500 }
    );
  }
}
