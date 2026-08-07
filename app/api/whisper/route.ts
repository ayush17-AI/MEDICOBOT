import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64 } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is missing on Vercel environment');
      return NextResponse.json({ error: 'Groq API Key configuration missing' }, { status: 500 });
    }

    // Convert Base64 back to Node Buffer
    const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Construct valid multipart payload for Groq
    const formData = new FormData();
    const audioFile = new File([audioBuffer], 'speech.webm', { type: 'audio/webm' });
    formData.append('file', audioFile);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    formData.append('prompt', '0 1 2 3 4 5 6 7 8 9 numbers mobile phone digits');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API Live Error:', errText);
      return NextResponse.json({ error: 'Transcription failed', details: errText }, { status: groqRes.status });
    }

    const data = await groqRes.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (error: any) {
    console.error('Serverless Whisper API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error?.message || String(error) }, { status: 500 });
  }
}
