import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured' }, { status: 500 });
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file, 'speech.webm');
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('language', 'en');
    groqFormData.append('prompt', '0 1 2 3 4 5 6 7 8 9 digits mobile phone number 111 000 777 double triple');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq Whisper API response error:', response.status, errText);
      return NextResponse.json({ error: 'Groq Whisper API error', details: errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (error) {
    console.error('Groq Whisper API Exception:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio via Groq' }, { status: 500 });
  }
}
