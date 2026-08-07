import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('[API ERROR] GROQ_API_KEY missing in Vercel environment.');
      return NextResponse.json({ error: 'GROQ_API_KEY missing' }, { status: 500 });
    }

    const body = await req.json();
    const { audioBase64 } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }

    // Clean base64 string
    const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    const audioFile = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' });
    formData.append('file', audioFile);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey.trim()}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[GROQ API ERROR]:', groqRes.status, errText);
      return NextResponse.json({ error: 'Groq API error', status: groqRes.status, details: errText }, { status: groqRes.status });
    }

    const data = await groqRes.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (err: any) {
    console.error('[SERVERLESS EXCEPTION]:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message || String(err) }, { status: 500 });
  }
}
