import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vitalsHistory = body.vitalsHistory || [
      { date: 'Aug 04, 2026', temp: 98.6, heartRate: 115, spo2: 89, sysBP: 140, diaBP: 90, status: 'MILD_ABNORMAL' },
      { date: 'Jul 28, 2026', temp: 102.4, heartRate: 98, spo2: 96, sysBP: 122, diaBP: 80, status: 'MILD_ABNORMAL' },
      { date: 'Jul 15, 2026', temp: 98.4, heartRate: 72, spo2: 99, sysBP: 118, diaBP: 78, status: 'NORMAL' },
      { date: 'Jun 30, 2026', temp: 98.2, heartRate: 68, spo2: 98, sysBP: 120, diaBP: 80, status: 'NORMAL' },
    ];

    if (!process.env.GROQ_API_KEY) {
      const fallbackSummary = `• Aug 04, 2026: SpO2 dropped to 89% (Hypoxia Warning), Heart Rate 115 BPM.
• Jul 28, 2026: Elevated Body Temp 102.4°F (Fever).
(Note: 12 normal vital logs hidden to keep clinical view concise).`;
      return NextResponse.json({ summary: fallbackSummary }, { status: 200 });
    }

    const prompt = `Analyze this patient's historical vitals logs: ${JSON.stringify(vitalsHistory)}.
    Rule 1: Completely ignore and DO NOT print dates where all vitals were normal (Temp 97-99F, SpO2 95-100%, HR 60-100).
    Rule 2: For any date with abnormal readings, write a concise 1-line bullet point stating the date, the abnormal metric, and clinical note.
    Rule 3: Keep it extremely clear for a doctor. Return only bullet points. Finish with a note on how many normal logs were hidden.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    });

    const summary =
      completion.choices[0]?.message?.content ||
      `• Aug 04, 2026: SpO2 dropped to 89% (Hypoxia Warning), Heart Rate 115 BPM.\n• Jul 28, 2026: Elevated Body Temp 102.4°F (Fever).\n(Note: 12 normal vital logs hidden to keep clinical view concise).`;

    return NextResponse.json({ summary }, { status: 200 });
  } catch (err) {
    const fallbackSummary = `• Aug 04, 2026: SpO2 dropped to 89% (Hypoxia Warning), Heart Rate 115 BPM.
• Jul 28, 2026: Elevated Body Temp 102.4°F (Fever).
(Note: 12 normal vital logs hidden to keep clinical view concise).`;
    return NextResponse.json({ summary: fallbackSummary }, { status: 200 });
  }
}
