import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, patientName, primarySymptom, riskScore } = await req.json();
    
    // IMPORTANT: Check your Fast2SMS Dashboard for a fresh API Key if this is exhausted
    const apiKey = process.env.FAST2SMS_API_KEY || 'oxqVYnXT2IWORgZiUeaK6Myzm9sCcGrbvwEP73uNlQLjHtFk0DOH2WylisDRPwcnU4VzCKpgraedLNG8';
    const cleanPhone = (to || '').replace(/[^0-9]/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Invalid 10-digit phone number' }, { status: 400 });
    }

    const messageText = riskScore && riskScore > 0
      ? `CRITICAL MEDICAL ALERT: Patient ${patientName || 'Emergency'} is at HIGH RISK (${riskScore}/100) due to ${primarySymptom || 'acute symptoms'}. Please check immediately.`
      : `MEDICOBOT ALERT: Hello ${patientName || 'Patient'}, ${primarySymptom || 'your booking is confirmed.'}`;

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
    
    if (data.return === false) {
      // Fast2SMS explicitly rejected it (e.g. DND, no balance, restricted number)
      return NextResponse.json({ success: false, error: data.message || 'Fast2SMS Rejected Dispatch', result: data }, { status: 200 }); 
    }

    return NextResponse.json({ success: true, result: data, cleanPhone });
  } catch (error: any) {
    console.error('[SMS DISPATCH ERR]', error);
    return NextResponse.json({ success: false, error: error.message || 'SMS send failed' }, { status: 500 });
  }
}
