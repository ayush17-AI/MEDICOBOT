import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface TriageResult {
  department: string;
  clinical_summary: string;
  possible_conditions: string[];
  provider: string;
}

interface TriageRequestBody {
  symptomText: string;
  age?: string;
  sex?: string;
  lang?: "en" | "hi";
}

const SYSTEM_PROMPT = `You are MEDICOBOT Clinical AI Triage Engine, trained on emergency medical protocols.

ANALYZE SYMPTOMS WITH DEEP CLINICAL INTELLIGENCE:
1. Department Mapping: Assign the most critical specialty department based on symptoms (e.g., Chest pain + Headache = Cardiology / Emergency Medicine / Neurology).
2. DO NOT include any severity scores (Green/Red/Yellow).
3. Identify 3-4 clinical "Possible Causes / Differential Conditions" considering all factors (e.g., Angina / Ischemic Cardiac Evaluation, Hypertensive Crisis, Migraine/Tension Headache with Stress, Gastroesophageal Acid Reflux).
4. Provide a highly professional, 2-sentence Clinical Reasoning Summary explaining why these symptoms require this specialist.

REQUIRED JSON OUTPUT FORMAT:
{
  "department": "Cardiology / Emergency Medicine",
  "clinical_summary": "Chest pain persisting for 2 days combined with an acute headache strongly warrants immediate cardiac and vascular evaluation to rule out hypertensive crisis or coronary issues alongside musculoskeletal or gastrointestinal causes.",
  "possible_conditions": [
    "Acute Coronary Assessment / Angina Evaluation",
    "Hypertensive Crisis / Elevated Blood Pressure Symptoms",
    "Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm",
    "Tension / Vascular Headache"
  ]
}`;

function buildUserPrompt(body: TriageRequestBody): string {
  return `Patient age: ${body.age ?? "unknown"}
Patient sex: ${body.sex ?? "unknown"}
Reported symptoms (patient's own words, language=${body.lang ?? "en"}):
"${body.symptomText}"

Return the JSON triage object now.`;
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
      : typeof p.reasoning_summary === "string"
      ? p.reasoning_summary
      : typeof p.clinical_reasoning === "string"
      ? p.clinical_reasoning
      : "Immediate clinical evaluation assigned based on multi-system symptom presentation.";
  
  const possible_conditions = Array.isArray(p.possible_conditions)
    ? (p.possible_conditions as unknown[]).map(String).slice(0, 5)
    : Array.isArray(p.differential_factors)
    ? (p.differential_factors as unknown[]).map(String).slice(0, 5)
    : [
        "Acute Coronary Assessment / Angina Evaluation",
        "Hypertensive Crisis / Elevated Blood Pressure Symptoms",
        "Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm",
        "Vascular / Tension Headache Evaluation"
      ];

  return {
    department,
    clinical_summary,
    possible_conditions,
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
  if (/chest|breath|heart|headache/.test(text)) {
    return {
      department: "Cardiology / Emergency Medicine",
      clinical_summary:
        "Chest pain persisting for 2 days combined with headache symptoms strongly warrants immediate cardiac and vascular evaluation to rule out hypertensive crisis or coronary issues alongside musculoskeletal or gastrointestinal causes.",
      possible_conditions: [
        "Acute Coronary Assessment / Angina Evaluation",
        "Hypertensive Crisis / Elevated Blood Pressure Symptoms",
        "Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm",
        "Vascular / Tension Headache Evaluation"
      ],
    };
  }
  if (/stomach|abdomen|nausea|vomit/.test(text)) {
    return {
      department: "Gastroenterology",
      clinical_summary:
        "Reported abdominal distress and associated symptoms warrant a gastroenterology evaluation to assess digestive inflammation, acid reflux, or food sensitivity.",
      possible_conditions: [
        "Acute Gastritis / Indigestion",
        "Gastroesophageal Reflux",
        "Abdominal Wall Strain / Intestinal Irritation",
        "Mild Viral Gastroenteritis"
      ],
    };
  }
  return {
    department: "General Physician",
    clinical_summary:
      "Reported symptoms present without immediate single-system red flags. Consultation with a General Physician is assigned for comprehensive physical evaluation.",
    possible_conditions: [
      "Common Viral Illness / Systemic Fatigue",
      "Stress & Tension Related Discomfort",
      "General Primary Physical Checkup"
    ],
  };
}

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
      return NextResponse.json({ ...result, provider: provider.name } satisfies TriageResult);
    } catch (err) {
      console.error(`[triage] ${provider.name} failed:`, err instanceof Error ? err.message : err);
    }
  }

  const mock = offlineMock(body);
  return NextResponse.json({ ...mock, provider: "offline-mock" } satisfies TriageResult);
}
