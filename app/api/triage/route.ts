import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export type Department = "Cardiology" | "Gastroenterology" | "General Physician" | "Neurology" | "Orthopedics" | "Pulmonology" | "ENT" | "Pediatrics";
export type Severity = "Red" | "Yellow" | "Green" | "Red (Emergency)" | "Yellow (Urgent)" | "Green (Standard)";

export interface TriageResult {
  department: string;
  severity: string;
  differential_factors?: string[];
  clinical_reasoning?: string;
  reasoning_summary?: string;
  summary?: string;
  provider: string;
}

interface TriageRequestBody {
  symptomText: string;
  age?: string;
  sex?: string;
  lang?: "en" | "hi";
}

const VALID_DEPARTMENTS: Department[] = [
  "Cardiology",
  "Gastroenterology",
  "General Physician",
  "Neurology",
  "Orthopedics",
];
const VALID_SEVERITIES: Severity[] = ["Red", "Yellow", "Green", "Red (Emergency)", "Yellow (Urgent)", "Green (Standard)"];

const SYSTEM_PROMPT = `You are a Senior Emergency & Clinical Triage Specialist. Analyze the patient's symptoms thoroughly.

STRICT MEDICAL TRIAGE RULES:
1. ACCURATE SEVERITY & DEPARTMENT:
   - "Chest pain" (especially lasting 2 days or associated with pressure, tightness, or discomfort) IS NEVER A ROUTINE CHECKUP OR SEVERITY GREEN. It MUST be mapped to "Cardiology" or "Emergency / Internal Medicine" with Severity "Red (Emergency)" or "Yellow (Urgent)".
   - Other RED flags: Shortness of breath, severe head trauma, acute paralysis, uncontrollable bleeding.

2. MULTI-FACTOR DIFFERENTIAL ANALYSIS:
   - Provide a comprehensive multi-factor breakdown of potential root causes (e.g., Cardiac risk evaluation required, Gastrointestinal Acid Reflux/Esophageal Spasm, Musculoskeletal chest wall injury, Respiratory evaluation).

3. NO PREMATURE SINGLE DIAGNOSIS:
   - Do NOT say "You have a Heart Attack". State that multi-factor clinical evaluation is required.

REQUIRED JSON FORMAT:
{
  "department": "Cardiology",
  "severity": "Red",
  "reasoning_summary": "Chest pain persisting for 2 days requires immediate clinical evaluation to rule out cardiac acute coronary syndrome alongside gastrointestinal or musculoskeletal causes.",
  "differential_factors": [
    "Cardiac Evaluation (Rule out Acute Coronary Syndrome)",
    "Gastrointestinal Reflux / Esophageal Spasm",
    "Musculoskeletal Chest Wall Strain"
  ]
}`;

function buildUserPrompt(body: TriageRequestBody): string {
  return `Patient age: ${body.age ?? "unknown"}
Patient sex: ${body.sex ?? "unknown"}
Reported symptoms (patient's own words, possibly transcribed via voice, language=${body.lang ?? "en"}):
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
  const department = VALID_DEPARTMENTS.includes(p.department as Department)
    ? (p.department as Department)
    : "Cardiology";
  const severity = VALID_SEVERITIES.includes(p.severity as Severity) ? (p.severity as Severity) : "Red";
  const differential_factors = Array.isArray(p.differential_factors)
    ? (p.differential_factors as unknown[]).map(String).slice(0, 6)
    : ["Cardiac Evaluation Required", "Gastrointestinal Reflux", "Musculoskeletal Strain"];
  const reasoning_summary =
    typeof p.reasoning_summary === "string"
      ? p.reasoning_summary
      : typeof p.clinical_reasoning === "string"
      ? p.clinical_reasoning
      : "Immediate clinical evaluation assigned based on reported symptoms.";

  return {
    department,
    severity,
    differential_factors,
    clinical_reasoning: reasoning_summary,
    reasoning_summary,
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
  if (/chest|breath|heart/.test(text)) {
    return {
      department: "Cardiology",
      severity: "Red",
      differential_factors: [
        "Cardiac Evaluation (Rule out Acute Coronary Syndrome)",
        "Gastrointestinal Reflux / Esophageal Spasm",
        "Musculoskeletal Chest Wall Strain",
      ],
      clinical_reasoning:
        "Chest pain persisting for 2 days requires immediate clinical evaluation to rule out cardiac acute coronary syndrome alongside gastrointestinal or musculoskeletal causes.",
      reasoning_summary:
        "Chest pain persisting for 2 days requires immediate clinical evaluation to rule out cardiac acute coronary syndrome alongside gastrointestinal or musculoskeletal causes.",
    };
  }
  if (/stomach|abdomen|nausea|vomit/.test(text)) {
    return {
      department: "Gastroenterology",
      severity: "Yellow",
      differential_factors: ["Gastritis / Indigestion", "Food Intolerance", "Abdominal Wall Strain"],
      clinical_reasoning:
        "Reported abdominal symptoms warrant urgent gastroenterology consultation for comprehensive evaluation.",
      reasoning_summary:
        "Reported abdominal symptoms warrant urgent gastroenterology consultation for comprehensive evaluation.",
    };
  }
  return {
    department: "General Physician",
    severity: "Green",
    differential_factors: ["Common Viral Illness", "Fatigue / Lifestyle Factors", "General Evaluation Required"],
    clinical_reasoning:
      "Symptoms described do not indicate acute red-flag risks; standard General Physician consultation is assigned.",
    reasoning_summary:
      "Symptoms described do not indicate acute red-flag risks; standard General Physician consultation is assigned.",
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
