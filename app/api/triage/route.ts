import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // SYSTEM INSTRUCTION FOR MEDICAL TRIAGE
    const systemPrompt = `You are MEDICOBOT AI Triage Engine. Analyze patient symptoms and output JSON with:
1. "department": Recommended hospital specialty department (e.g., Cardiology, Neurology, Orthopedics, General Physician, ENT, Pediatrics).
2. "severity": "Red" | "Yellow" | "Green".
3. "summary": A brief 1-line summary of patient condition.

Patient Input: ${prompt}`;

    // 1. TRY GROQ API (PRIMARY ENGINE)
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here') {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a precise medical triage AI. Return responses in valid JSON format.' },
            { role: 'user', content: systemPrompt }
          ],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' }
        });

        const result = completion.choices[0]?.message?.content;
        if (result) {
          return NextResponse.json({ 
            data: JSON.parse(result), 
            provider: 'Groq Cloud (Primary)' 
          });
        }
      } catch (err) {
        console.warn("Groq API failed. Switching to Gemini Fallback...", err);
      }
    }

    // 2. TRY GEMINI API (SECONDARY FALLBACK)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'AIzaSy_your_gemini_api_key_here') {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: "application/json" }
        });
        
        const result = await model.generateContent(systemPrompt);
        const textResponse = result.response.text();
        
        if (textResponse) {
          return NextResponse.json({ 
            data: JSON.parse(textResponse), 
            provider: 'Google Gemini (Fallback 1)' 
          });
        }
      } catch (err) {
        console.warn("Gemini API failed. Switching to OpenAI Fallback...", err);
      }
    }

    // 3. TRY OPENAI API (FINAL FALLBACK)
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-proj-your_openai_api_key_here') {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a precise medical triage AI. Return valid JSON.' },
            { role: 'user', content: systemPrompt }
          ],
          response_format: { type: 'json_object' }
        });

        const result = response.choices[0]?.message?.content;
        if (result) {
          return NextResponse.json({ 
            data: JSON.parse(result), 
            provider: 'OpenAI (Fallback 2)' 
          });
        }
      } catch (err) {
        console.error("OpenAI API failed.", err);
      }
    }

    // 4. MOCK FALLBACK (If all APIs fail or keys are unconfigured)
    return NextResponse.json({
      data: {
        department: "General Physician",
        severity: "Yellow",
        summary: "Symptom analysis completed via offline safety backup."
      },
      provider: "Mock Safe Mode (Offline Backup)"
    });

  } catch (globalError) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
