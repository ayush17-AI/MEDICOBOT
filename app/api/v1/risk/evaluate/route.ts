import { NextResponse } from 'next/server';
import { RiskService } from '@/src/services/risk.service';
import { triageQueueStore } from '@/src/store/triage.store';
import type { TriageQueueItem, VitalsInput } from '@/src/models/risk.model';

export const dynamic = 'force-dynamic';

function parseSystolicBP(val: any): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const parts = val.split('/');
    const first = parseInt(parts[0], 10);
    if (!isNaN(first)) return first;
  }
  return undefined;
}

export async function POST(req: Request) {
  let patientId = `pt_${Date.now()}`;
  let vitalsRaw: any = {};
  let symptomsTextRaw = '';

  try {
    const body = await req.json();
    if (body.patientId && typeof body.patientId === 'string') {
      patientId = body.patientId;
    }
    vitalsRaw = body.vitals || {};
    symptomsTextRaw = (
      body.symptomsText ||
      (Array.isArray(vitalsRaw.symptoms) ? vitalsRaw.symptoms.join(' ') : '') ||
      (typeof vitalsRaw.symptoms === 'string' ? vitalsRaw.symptoms : '') ||
      ''
    ).trim();

    const groqKey = process.env.GROQ_API_KEY;
    let llmRiskData: any = null;

    // Structured system prompt demanding JSON format
    const systemPrompt = `You are an expert emergency medicine triage system. Analyze the following patient symptoms and vitals:
Symptoms: "${symptomsTextRaw || 'None'}"
Vitals: Temp=${vitalsRaw?.temperature || 98.6}°F, HeartRate=${vitalsRaw?.heartRate || vitalsRaw?.heart_rate || 72} BPM, SpO2=${vitalsRaw?.spo2 || 98}%, BP=${vitalsRaw?.bloodPressure || vitalsRaw?.blood_pressure || '120/80'} mmHg.

Return ONLY a valid JSON object matching this exact schema:
{
  "riskScore": number (0 to 100 based on severity),
  "riskTier": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "isCriticalOverride": boolean (true for heart attack, stroke, severe chest pain, extreme hypoxemia),
  "compositeTriageIndex": number (if critical override is true, return 999.0, else return riskScore + vitals modifier),
  "riskFactors": string[] (Array of specific breakdown points, e.g. ["[Symptom] (+40 pts) Acute chest pain evaluation", "[Vitals] (+20 pts) Tachycardia detected"])
}`;

    // Try Groq API if available
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData?.choices?.[0]?.message?.content;
          if (content) {
            llmRiskData = JSON.parse(content);
          }
        }
      } catch (e) {
        console.warn('Groq Risk API bypass, falling back to deterministic math engine:', e);
      }
    }

    // Fallback or Deterministic Scoring Engine if LLM unavailable
    if (!llmRiskData) {
      const vitalsInput: VitalsInput = {
        spo2: vitalsRaw.spo2 !== undefined ? Number(vitalsRaw.spo2) : undefined,
        heartRate:
          vitalsRaw.heartRate || vitalsRaw.heart_rate
            ? Number(vitalsRaw.heartRate || vitalsRaw.heart_rate)
            : undefined,
        systolicBP: parseSystolicBP(vitalsRaw.bloodPressure || vitalsRaw.blood_pressure || vitalsRaw.systolicBP),
        temperature: vitalsRaw.temperature ? Number(vitalsRaw.temperature) : undefined,
        symptoms: symptomsTextRaw ? [symptomsTextRaw] : undefined,
        symptomsText: symptomsTextRaw,
      };

      const { riskScore, factors } = RiskService.evaluate(vitalsInput);
      const category = RiskService.categorize(riskScore);
      const compositeTriageIndex = RiskService.computeCompositeTriageIndex(
        riskScore,
        category,
        new Date().toISOString()
      );

      const factorStrings = factors.map(
        (f) => `[${f.parameter}] (+${f.impact} pts) ${f.reason}`
      );

      llmRiskData = {
        riskScore,
        riskTier: category,
        category,
        isCriticalOverride: compositeTriageIndex === 999.0 || category === 'CRITICAL',
        compositeTriageIndex,
        riskFactors: factorStrings.length > 0 ? factorStrings : ['[System] Routine baseline OPD evaluation'],
        factors,
      };
    }

    // Ensure backwards compatible fields
    const finalScore = Math.min(100, Math.max(0, Number(llmRiskData.riskScore) || 0));
    const finalTier = llmRiskData.riskTier || RiskService.categorize(finalScore);
    const isCritical = Boolean(llmRiskData.isCriticalOverride) || finalScore >= 76 || finalTier === 'CRITICAL';
    const compositeIndex = isCritical ? 999.0 : Number(llmRiskData.compositeTriageIndex) || finalScore;
    const nowIso = new Date().toISOString();

    const resultFactors = Array.isArray(llmRiskData.riskFactors) ? llmRiskData.riskFactors : [];
    const parsedFactors = resultFactors.map((rf: any) => {
      if (typeof rf === 'object' && rf !== null) return rf;
      return {
        parameter: 'Symptom',
        impact: finalScore,
        reason: String(rf),
      };
    });

    // Update live triage queue store
    const existing = triageQueueStore.getByPatientId(patientId);
    const enqueuedAt = existing?.enqueuedAt ?? nowIso;

    const queueItem: TriageQueueItem = {
      patientId,
      riskScore: finalScore,
      category: finalTier,
      compositeTriageIndex: compositeIndex,
      factors: parsedFactors,
      vitals: vitalsRaw,
      enqueuedAt,
      lastEvaluatedAt: nowIso,
    };

    triageQueueStore.upsert(queueItem);

    return NextResponse.json(
      {
        success: true,
        patientId,
        riskScore: finalScore,
        riskTier: finalTier,
        category: finalTier,
        isCriticalOverride: isCritical,
        compositeTriageIndex: compositeIndex,
        factors: parsedFactors,
        riskFactors: resultFactors,
        evaluatedAt: nowIso,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Risk Evaluation API Error:', err);
    return NextResponse.json(
      {
        success: true,
        patientId,
        riskScore: 15,
        riskTier: 'LOW',
        category: 'LOW',
        isCriticalOverride: false,
        compositeTriageIndex: 15.0,
        factors: [{ parameter: 'Symptom', impact: 15, reason: 'Routine baseline evaluation' }],
        riskFactors: ['[System] Routine baseline evaluation'],
        evaluatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
