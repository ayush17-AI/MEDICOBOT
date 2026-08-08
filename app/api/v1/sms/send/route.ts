import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, patientName, riskScore, primarySymptom } = await req.json();

    if (!to) {
      return NextResponse.json({ success: false, error: 'Recipient phone number missing' }, { status: 400 });
    }

    const apiKey = process.env.FAST2SMS_API_KEY || 'oxqVYnXT2IWORgZiUeaK6Myzm9sCcGrbvwEP73uNlQLjHtFk0DOH2WylisDRPwcnU4VzCKpgraedLNG8';

    // Format phone number to strictly 10 digits
    const cleanPhone = to.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Invalid 10-digit phone number' }, { status: 400 });
    }

    const messageText = `CRITICAL MEDICAL ALERT: Patient ${patientName || 'Emergency'} is at HIGH RISK (${riskScore || 85}/100) due to ${primarySymptom || 'acute symptoms'}. Please check immediately.`;

    // Fast2SMS Call
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
    console.log('[FAST2SMS DISPATCH RESULT]', data);

    // Provide pre-formatted Native URI Deep Link for client fallback
    const nativeSmsLink = `sms:+91${cleanPhone}?body=${encodeURIComponent(messageText)}`;

    return NextResponse.json({
      success: true,
      provider: 'Fast2SMS',
      result: data,
      nativeSmsLink: nativeSmsLink,
      cleanPhone: cleanPhone,
    });
  } catch (error: any) {
    console.error('[SMS DISPATCH ERR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
