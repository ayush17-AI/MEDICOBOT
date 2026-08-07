import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 10; // Capped for Vercel Hobby Plan limits

export async function POST(req: NextRequest) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY missing' }, { status: 500 });
    }

    // Accept multipart/form-data directly to avoid Base64 inflation & Vercel 4.5MB limit
    const incomingForm = await req.formData();
    const audioFile = incomingForm.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }

    // Guard explicitly against Vercel platform payload caps
    const MAX_BYTES = 4 * 1024 * 1024; // 4MB safe threshold
    if (audioFile.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Audio file too large', details: `${audioFile.size} bytes exceeds ${MAX_BYTES}` },
        { status: 413 }
      );
    }

    const formData = new FormData();
    formData.append('file', audioFile, 'recording.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');

    // 8-second explicit timeout controller to prevent infinite pending requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let groqRes: Response;
    try {
      groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey.trim()}`,
        },
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json({ error: 'Groq API error', details: errText }, { status: groqRes.status });
    }

    const data = await groqRes.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Transcription request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message || String(err) }, { status: 500 });
  }
}
