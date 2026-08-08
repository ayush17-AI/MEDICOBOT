'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSpeechRecognition, cleanTranscript } from '@/lib/useSpeechRecognition';
import { RiskService } from '@/src/services/risk.service';
import { logTimelineEvent } from '@/lib/timelineLogger';

function parseSystolicBP(val: any): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const parts = val.split('/');
    const first = parseInt(parts[0], 10);
    if (!isNaN(first)) return first;
  }
  return undefined;
}

export default function SymptomsClient() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem('medicobot_patient');
      const v = sessionStorage.getItem('medicobot_vitals');
      if (p) setPatient(JSON.parse(p));
      if (v) setVitals(JSON.parse(v));
    } catch (e) {
      console.warn('Failed to load session payload:', e);
    }
  }, []);

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'en',
    onTranscript: (spokenText) => {
      if (spokenText) {
        // Direct assignment without string concatenation loops to fix "Chest Chest pain..." bug
        setSymptoms(spokenText.trim());
      }
    },
  });

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: symptoms, symptomText: symptoms }),
      });
      const json = await res.json();
      const triage = json?.data || json || {
        department: 'General Physician / Internal Medicine',
        summary: 'Clinical symptom assessment complete based on reported history.',
        possible_conditions: ['Viral Syndrome', 'Upper Respiratory Evaluation'],
      };

      // Call Bounty 4 Risk Engine /api/v1/risk/evaluate
      let riskResult: any = null;
      try {
        const patientId = patient?.id || patient?.phone || patient?.name || `pt_${Date.now()}`;
        const rawSymptoms = symptoms.trim();
        const fullText = `${rawSymptoms} ${triage?.summary || ''} ${triage?.clinical_summary || ''}`.trim();
        const symptomLLMScore = typeof triage?.symptomLLMScore === 'number' ? triage.symptomLLMScore : 20;

        const riskRes = await fetch('/api/v1/risk/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            symptomLLMScore,
            vitals: {
              spo2: vitals?.spo2 ? Number(vitals.spo2) : undefined,
              heartRate: vitals?.heart_rate || vitals?.heartRate ? Number(vitals.heart_rate || vitals.heartRate) : undefined,
              systolicBP: parseSystolicBP(vitals?.blood_pressure || vitals?.bloodPressure || vitals?.systolicBP),
              temperature: vitals?.temperature ? Number(vitals.temperature) : undefined,
              symptoms: [rawSymptoms],
              symptomsText: fullText,
            },
          }),
        });
        if (riskRes.ok) {
          riskResult = await riskRes.json();
        }
      } catch (rErr) {
        console.warn('Risk evaluation API notice:', rErr);
      }

      if (!riskResult) {
        const rawSymptoms = symptoms.trim();
        const fullText = `${rawSymptoms} ${triage?.summary || ''} ${triage?.clinical_summary || ''}`.trim();
        const symptomLLMScore = typeof triage?.symptomLLMScore === 'number' ? triage.symptomLLMScore : 20;
        const evaluated = RiskService.evaluate({
          spo2: vitals?.spo2 ? Number(vitals.spo2) : undefined,
          heartRate: vitals?.heart_rate || vitals?.heartRate ? Number(vitals.heart_rate || vitals.heartRate) : undefined,
          systolicBP: parseSystolicBP(vitals?.blood_pressure || vitals?.bloodPressure || vitals?.systolicBP),
          temperature: vitals?.temperature ? Number(vitals.temperature) : undefined,
          symptoms: [rawSymptoms],
          symptomsText: fullText,
        }, symptomLLMScore);
        const cat = RiskService.categorize(evaluated.riskScore);
        const comp = RiskService.computeCompositeTriageIndex(evaluated.riskScore, cat, new Date().toISOString());
        riskResult = {
          patientId: patient?.id || patient?.phone || patient?.name || `pt_${Date.now()}`,
          riskScore: evaluated.riskScore,
          category: cat,
          riskTier: cat,
          compositeTriageIndex: comp,
          factors: evaluated.factors,
          riskFactors: evaluated.factors,
          evaluatedAt: new Date().toISOString(),
        };
      }

      sessionStorage.setItem('medicobot_symptoms', symptoms.trim());
      sessionStorage.setItem('medicobot_triage', JSON.stringify(triage));
      sessionStorage.setItem('medicobot_risk_evaluation', JSON.stringify(riskResult));

      // Log timeline event for symptom detection & risk evaluation
      const pid = patient?.id || patient?.phone || patient?.name || 'anonymous_patient';
      logTimelineEvent({
        patientId: pid,
        eventType: 'SYMPTOM_DETECTED',
        summary: `Symptom Analysis: ${symptoms.trim().substring(0, 60)}...`,
        details: { symptoms: symptoms.trim(), triage, riskScore: riskResult?.riskScore },
        severity: riskResult?.riskScore >= 76 ? 'CRITICAL' : riskResult?.riskScore >= 51 ? 'HIGH' : 'LOW',
      });

      // Save Vitals + Symptoms + Risk Evaluation to Supabase patient_records
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('patient_records').insert([
        {
          user_id: user?.id || null,
          patient_name: patient?.name || 'Anonymous Patient',
          phone_number: patient?.phone || patient?.mobile || 'N/A',
          symptoms: symptoms.trim(),
          kiosk_data: {
            ...patient,
            vitals: vitals || {},
            triage,
            risk_evaluation: riskResult,
            submitted_at: new Date().toISOString(),
          },
        },
      ]);

      // Route directly to Step 3: Doctor Consultation & Specialist Selection Page
      router.push('/consultation');
    } catch (err) {
      console.warn('Triage API or DB Sync Notice:', err);
      const fallbackTriage = {
        department: 'General Physician / Internal Medicine',
        summary: 'Symptom assessment logged. Further physical examination advised.',
        possible_conditions: ['General Consultation Required'],
      };
      sessionStorage.setItem('medicobot_symptoms', symptoms.trim());
      sessionStorage.setItem('medicobot_triage', JSON.stringify(fallbackTriage));
      router.push('/consultation');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg space-y-6 my-6">
        {/* Centered Image 2 Symptom Card */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center">
          {/* Header Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Describe Your Symptoms
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Tap the mic and speak clearly, or type in the box below
            </p>
          </div>

          {/* Big Center Mic Button */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <button
              type="button"
              onClick={toggleRecording}
              data-testid="voice-recorder-btn"
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 animate-pulse ring-8 ring-red-200 scale-105'
                  : 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/30'
              }`}
            >
              {isListening ? <MicOff size={36} /> : <Mic size={36} />}
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              {isListening ? '🎙️ LISTENING...' : 'TAP TO SPEAK'}
            </span>
          </div>

          {/* Label & Textarea */}
          <div className="text-left space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
              SYMPTOM TRANSCRIPT (REVIEW / EDIT) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g., Severe chest pain, shortness of breath, and mild dizziness for 2 hours..."
              data-testid="symptoms-textarea"
              className="w-full p-4 rounded-2xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-sm font-medium outline-none text-slate-900 placeholder:text-slate-400 bg-white shadow-xs"
            />
          </div>

          {/* Primary Full Width Action Button */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !symptoms.trim()}
            data-testid="analyze-symptoms-btn"
            className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
              !symptoms.trim() || isAnalyzing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-600/25 cursor-pointer'
            }`}
          >
            <span>{isAnalyzing ? 'Analyzing Symptoms...' : '🩺 Analyze Symptoms →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
