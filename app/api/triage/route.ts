import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface TriageResult {
  department: string;
  clinical_summary: string;
  possible_conditions: string[];
  symptomLLMScore: number;
  provider: string;
}

interface TriageRequestBody {
  symptomText: string;
  age?: string;
  sex?: string;
  lang?: "en" | "hi";
}

const SYSTEM_PROMPT = `You are a clinical triage AI. Evaluate the user's reported symptoms.
Assign a symptom severity score between 0 and 100 based strictly on emergency clinical guidelines.

REQUIRED JSON OUTPUT FORMAT ONLY:
{
  "symptomLLMScore": number,
  "clinical_summary": "string describing clinical reasoning",
  "department": "string specialty department",
  "possible_conditions": ["string condition 1", "string condition 2", "string condition 3"]
}`;

function buildUserPrompt(body: TriageRequestBody): string {
  return `Patient age: ${body.age ?? "unknown"}
Patient sex: ${body.sex ?? "unknown"}
Reported symptoms (patient's own words, language=${body.lang ?? "en"}):
"${body.symptomText}"

Return JSON ONLY now.`;
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

function coerceResult(parsed: unknown): Omit<TriageResult, "provider"> {
  const p = parsed as Record<string, unknown>;
  const department = typeof p.department === "string" ? p.department : "Cardiology / Emergency Medicine";
  const clinical_summary =
    typeof p.clinical_summary === "string"
      ? p.clinical_summary
      : typeof p.clinicalReasoning === "string"
      ? p.clinicalReasoning
      : "Immediate clinical evaluation assigned based on multi-system symptom presentation.";
  
  const possible_conditions = Array.isArray(p.possible_conditions)
    ? (p.possible_conditions as unknown[]).map(String).slice(0, 5)
    : [
        "Acute Coronary Assessment / Angina Evaluation",
        "Hypertensive Crisis / Elevated Blood Pressure Symptoms",
        "Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm",
        "Vascular / Tension Headache Evaluation"
      ];

  const rawScore = Number(p.symptomLLMScore ?? p.symptomScore ?? p.severityScore);
  const symptomLLMScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 20;

  return {
    department,
    clinical_summary,
    possible_conditions,
    symptomLLMScore,
  };
}

/* ---------------------------- Provider calls ---------------------------- */

async function tryGroq(userPrompt: string): Promise<Omit<TriageResult, "provider">> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const { default: Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey });
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return coerceResult(extractJson(raw));
}

async function tryGemini(userPrompt: string): Promise<Omit<TriageResult, "provider">> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY not set");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(userPrompt);
  const raw = result.response.text();
  return coerceResult(extractJson(raw));
}

async function tryOpenAI(userPrompt: string): Promise<Omit<TriageResult, "provider">> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return coerceResult(extractJson(raw));
}

function offlineMock(body: TriageRequestBody & { prompt?: string }): Omit<TriageResult, "provider"> {
  const text = (body.prompt || body.symptomText || "").toLowerCase();
  if (/chest|breath|heart|cardiac/.test(text)) {
    return {
      department: "Cardiology / Emergency Medicine",
      clinical_summary:
        "Chest pain or breathlessness symptoms strongly warrant immediate cardiac evaluation to rule out hypertensive crisis or acute coronary syndrome.",
      possible_conditions: [
        "Acute Coronary Assessment / Angina Evaluation",
        "Hypertensive Crisis / Elevated Blood Pressure Symptoms",
        "Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm",
      ],
      symptomLLMScore: 85,
    };
  }
  if (/headache|dizzy|faint|unconscious/.test(text)) {
    return {
      department: "Neurology",
      clinical_summary:
        "Neurological symptoms requiring urgent investigation to exclude vascular, intracranial, or hypertensive causes.",
      possible_conditions: [
        "Vascular / Tension Headache",
        "Transient Ischemic Attack",
        "Syncope Evaluation",
      ],
      symptomLLMScore: 60,
    };
  }
  return {
    department: "General Physician",
    clinical_summary:
      "Reported symptoms present without immediate single-system emergency red flags. Consultation assigned for general physical evaluation.",
    possible_conditions: [
      "Common Viral Illness",
      "Stress & Tension Discomfort",
      "Routine Physical Checkup",
    ],
    symptomLLMScore: 15,
  };
}

import { attachDisclaimerToPayload } from "@/src/compliance/disclaimer/triageDisclaimer";

export async function POST(req: NextRequest) {
  let body: TriageRequestBody & { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const inputPrompt = body.prompt || body.symptomText;
  if (!inputPrompt || !inputPrompt.trim()) {
    return NextResponse.json({ error: "prompt or symptomText is required" }, { status: 400 });
  }

  const userPrompt = buildUserPrompt({ ...body, symptomText: inputPrompt });

  const providers: { name: TriageResult["provider"]; run: () => Promise<Omit<TriageResult, "provider">> }[] = [
    { name: "groq", run: () => tryGroq(userPrompt) },
    { name: "gemini", run: () => tryGemini(userPrompt) },
    { name: "openai", run: () => tryOpenAI(userPrompt) },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.run();
      const payload = attachDisclaimerToPayload({ ...result, provider: provider.name });
      return NextResponse.json(payload satisfies TriageResult & { meta: any });
    } catch (err) {
      console.error(`[triage] ${provider.name} failed:`, err instanceof Error ? err.message : err);
    }
  }

  const mock = offlineMock(body);
  const payload = attachDisclaimerToPayload({ ...mock, provider: "offline-mock" });
  return NextResponse.json(payload satisfies TriageResult & { meta: any });
}
