'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Activity,
  Heart,
  Thermometer,
  Gauge,
  Mic,
  MicOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SymptomsClient() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [tokenGenerated, setTokenGenerated] = useState<string | null>(null);

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
      setTriageResult(triage);

      // Save BOTH Vitals + Symptoms to Supabase patient_records
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
            submitted_at: new Date().toISOString(),
          },
        },
      ]);
    } catch (err) {
      console.warn('Triage API or DB Sync Notice:', err);
      const fallbackTriage = {
        department: 'General Physician / Internal Medicine',
        summary: 'Symptom assessment logged. Further physical examination advised.',
        possible_conditions: ['General Consultation Required'],
      };
      setTriageResult(fallbackTriage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBookDoctor = (docName: string) => {
    const token = `MED-${Math.floor(1000 + Math.random() * 9000)}`;
    setSelectedDoc(docName);
    setTokenGenerated(token);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative p-4 sm:p-8 flex flex-col items-center overflow-y-auto">
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl space-y-6 my-4">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Stethoscope size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                  Step 3: AI Symptom Triage &amp; OPD Booking
                </span>
                {patient && (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <User size={13} /> {patient.name} ({patient.sex}, {patient.age}y)
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Symptom &amp; Clinical History Input
              </h1>
            </div>
          </div>

          <button
            onClick={() => router.push('/doctor-dashboard')}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Building size={14} />
            <span>Doctor Dashboard</span>
          </button>
        </div>

        {/* Recorded Vitals Summary Bar */}
        {vitals && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-wrap items-center justify-around gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className="text-orange-500" />
              <span className="text-slate-500 font-medium">Temp:</span>
              <span className="font-extrabold text-slate-900">{vitals.temperature}°F</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-rose-500" />
              <span className="text-slate-500 font-medium">Heart Rate:</span>
              <span className="font-extrabold text-slate-900">{vitals.heart_rate} BPM</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <span className="text-slate-500 font-medium">SpO2:</span>
              <span className="font-extrabold text-slate-900">{vitals.spo2}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-purple-500" />
              <span className="text-slate-500 font-medium">BP:</span>
              <span className="font-extrabold text-slate-900">{vitals.blood_pressure} mmHg</span>
            </div>
          </div>
        )}

        {/* Symptom Input Form */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Describe Your Health Symptoms <span className="text-red-500 font-black">*</span>
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. I have had a high fever for 2 days, severe headache, muscle aches, and mild sore throat..."
                data-testid="symptoms-textarea"
                className="w-full p-4 rounded-2xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-sm font-medium outline-none text-slate-900 placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !symptoms.trim()}
              data-testid="analyze-symptoms-btn"
              className={`w-full sm:w-auto py-3.5 px-8 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                !symptoms.trim() || isAnalyzing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-600/25 cursor-pointer'
              }`}
            >
              <span>{isAnalyzing ? 'Analyzing Symptoms...' : 'Run AI Symptom Triage'}</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => router.push('/vitals-dashboard')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={14} /> Back to Vitals
            </button>
          </div>
        </div>

        {/* AI Triage & OPD Token Output */}
        {triageResult && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                🩺
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Recommended Department
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {triageResult.department || 'General Physician'}
                </h3>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              {triageResult.summary || triageResult.clinical_summary}
            </p>

            {/* Token Generation */}
            {tokenGenerated ? (
              <div className="p-6 rounded-3xl bg-emerald-600 text-white shadow-lg space-y-2 text-center">
                <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full inline-block">
                  OPD Appointment Confirmed!
                </span>
                <h2 className="text-3xl font-black">{tokenGenerated}</h2>
                <p className="text-xs text-emerald-100">
                  Assigned Doctor: <strong>{selectedDoc}</strong> ({triageResult.department})
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => router.push('/doctor-dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition cursor-pointer shadow-md"
                  >
                    View Record in Doctor Dashboard →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Available OPD Specialists for Consultation:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Dr. Alok Mishra (General Physician)', 'Dr. Kavita Singh (Internal Medicine)'].map((doc) => (
                    <div
                      key={doc}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-teal-500 bg-slate-50/50 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-slate-800">{doc}</span>
                      <button
                        onClick={() => handleBookDoctor(doc)}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Book &amp; Generate Token
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
