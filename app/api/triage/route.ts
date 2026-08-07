import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export type Department = "Cardiology" | "Gastroenterology" | "General Physician" | "Neurology" | "Orthopedics" | "Pulmonology" | "ENT" | "Pediatrics";
export type Severity = "Red" | "Yellow" | "Green" | "Red (Emergency)" | "Yellow (Urgent)" | "Green (Standard)";

export interface TriageResult {
  department: string;
  severity: string;
  differential_factors?: string[];
  clinical_reasoning?: string;
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

const SYSTEM_PROMPT = `You are a clinical triage assistant at a hospital OPD intake kiosk.

STRICT RULES:
- Do NOT hand down a premature single-disease diagnosis.
- Perform a mandatory differential analysis: evaluate the reported symptoms across multiple plausible underlying causes before assigning a department (for example, chest pain should be weighed across gastrointestinal/reflux, musculoskeletal/injury, anxiety, respiratory, and cardiac risk).
- Assign exactly one routing department from this fixed list: ${VALID_DEPARTMENTS.join(", ")}.
- Assign exactly one severity from this fixed list: Red (Emergency), Yellow (Urgent), Green (Standard).
- If symptoms suggest possible life-threatening risk (e.g. crushing chest pain, difficulty breathing, stroke signs), err toward Red.
- Respond with ONLY a single JSON object, no prose before or after it, in exactly this shape:
{
  "department": "<one of: ${VALID_DEPARTMENTS.join(" | ")}>",
  "severity": "<Red | Yellow | Green>",
  "differential_factors": ["<3-5 short possible underlying causes considered>"],
  "clinical_reasoning": "<2-sentence explanation of why this department and severity were assigned, based on the differential analysis>"
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
    : "General Physician";
  const severity = VALID_SEVERITIES.includes(p.severity as Severity) ? (p.severity as Severity) : "Yellow";
  const differential_factors = Array.isArray(p.differential_factors)
    ? (p.differential_factors as unknown[]).map(String).slice(0, 6)
    : [];
  const clinical_reasoning =
    typeof p.clinical_reasoning === "string" ? p.clinical_reasoning : "Assessment generated from reported symptoms.";
  return { department, severity, differential_factors, clinical_reasoning };
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
    temperature: 0.3,
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
    temperature: 0.3,
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return coerceResult(extractJson(raw));
}

function offlineMock(body: TriageRequestBody & { prompt?: string }): Omit<TriageResult, "provider"> {
  const text = (body.prompt || body.symptomText || "").toLowerCase();
  if (/chest|breath|heart/.test(text)) {
    return {
      department: "Cardiology",
      severity: "Yellow",
      differential_factors: [
        "Gastrointestinal acid reflux / heartburn",
        "Musculoskeletal strain / chest wall discomfort",
        "Anxiety-related chest tightness",
        "Cardiac risk evaluation required",
      ],
      clinical_reasoning:
        "Chest-related symptoms carry a range of plausible causes from reflux to musculoskeletal strain, but cardiac risk cannot be excluded without evaluation, so routing to Cardiology with Yellow urgency is the safest default while AI providers are unavailable.",
    };
  }
  if (/stomach|abdomen|nausea|vomit/.test(text)) {
    return {
      department: "Gastroenterology",
      severity: "Green",
      differential_factors: ["Gastritis / indigestion", "Food intolerance", "Mild infection"],
      clinical_reasoning:
        "Reported abdominal symptoms most commonly stem from digestive causes without acute red-flag features, so a standard Gastroenterology consult is appropriate. This is an offline fallback estimate, not a live model assessment.",
    };
  }
  return {
    department: "General Physician",
    severity: "Green",
    differential_factors: ["Common viral illness", "Fatigue / lifestyle factors", "Requires in-person evaluation"],
    clinical_reasoning:
      "Symptoms described do not clearly map to a specialty department, so General Physician triage with standard priority is the safest default. This is an offline fallback estimate, not a live model assessment.",
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
      // fall through to next provider
    }
  }

  // All live providers unavailable or failed — safe offline fallback.
  const mock = offlineMock(body);
  return NextResponse.json({ ...mock, provider: "offline-mock" } satisfies TriageResult);
}
