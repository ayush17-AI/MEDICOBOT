import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No valid audio data received' }, { status: 400 });
    }

    // Convert Blob to Buffer for Vercel Node runtime compatibility
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Reconstruct clean FormData payload for Groq
    const groqPayload = new FormData();
    const blobFile = new File([buffer], 'speech.webm', { type: 'audio/webm' });
    groqPayload.append('file', blobFile);
    groqPayload.append('model', 'whisper-large-v3-turbo');
    groqPayload.append('language', 'en');
    groqPayload.append('prompt', '0 1 2 3 4 5 6 7 8 9 numbers mobile phone digits');

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is missing in Vercel environment');
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: groqPayload,
    });

    if (!response.ok) {
      const errRes = await response.text();
      console.error('Groq Whisper API response error:', errRes);
      return NextResponse.json({ error: 'Transcription failed', details: errRes }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (error: any) {
    console.error('Whisper route critical error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
