'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Star,
  CheckCircle2,
  Calendar,
  Sparkles,
  UserCheck,
  Award,
  ArrowRight,
  User,
  ArrowLeft,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { generateWhatsAppLink } from '@/lib/whatsappHelper';
import { RiskService } from '@/src/services/risk.service';

export interface DoctorSpec {
  id: string;
  name: string;
  department: string;
  rating: string;
  experience: string;
  availability: string;
  image: string;
}

const DOCTORS_DATABASE: DoctorSpec[] = [
  {
    id: 'doc-1',
    name: 'Dr. Alok Mishra',
    department: 'General Physician / Internal Medicine',
    rating: '4.9 / 5.0 (280+ Reviews)',
    experience: '14+ Yrs Exp',
    availability: 'Available Today • Room 204',
    image: '👨‍⚕️',
  },
  {
    id: 'doc-2',
    name: 'Dr. Kavita Singh',
    department: 'General Physician / Cardiology Triage',
    rating: '4.8 / 5.0 (195+ Reviews)',
    experience: '12+ Yrs Exp',
    availability: 'Available Today • Room 108',
    image: '👩‍⚕️',
  },
  {
    id: 'doc-3',
    name: 'Dr. Rajesh Vardhan',
    department: 'Pulmonology & Respiratory Medicine',
    rating: '4.95 / 5.0 (410+ Reviews)',
    experience: '18+ Yrs Exp',
    availability: 'Available Today • Room 302',
    image: '👨‍⚕️',
  },
  {
    id: 'doc-4',
    name: 'Dr. Sneha Roy',
    department: 'Emergency & Critical Care Medicine',
    rating: '4.9 / 5.0 (320+ Reviews)',
    experience: '10+ Yrs Exp',
    availability: 'On Duty Emergency • Trauma Desk',
    image: '👩‍⚕️',
  },
];

export default function ConsultationClient() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [triage, setTriage] = useState<any>(null);
  const [riskEvaluation, setRiskEvaluation] = useState<any>(null);

  // Flow State: 'none' (Initial 2 Choice Cards), 'ai' (AI Recommended Doctor), 'manual' (All OPD Doctors)
  const [selectionMode, setSelectionMode] = useState<'none' | 'ai' | 'manual'>('none');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSpec | null>(null);
  const [tokenGenerated, setTokenGenerated] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem('medicobot_patient');
      const v = sessionStorage.getItem('medicobot_vitals');
      const s = sessionStorage.getItem('medicobot_symptoms');
      const t = sessionStorage.getItem('medicobot_triage');
      const r = sessionStorage.getItem('medicobot_risk_evaluation');

      if (p) setPatient(JSON.parse(p));
      if (v) setVitals(JSON.parse(v));
      if (s) setSymptoms(s);
      if (t) setTriage(JSON.parse(t));
      if (r) setRiskEvaluation(JSON.parse(r));
    } catch (e) {
      console.warn('Session load notice:', e);
    }
  }, []);

  const activeRisk = React.useMemo(() => {
    if (riskEvaluation) return riskEvaluation;
    if (!vitals && !symptoms) return null;

    const parseSystolicBP = (val: any): number | undefined => {
      if (typeof val === 'number' && Number.isFinite(val)) return val;
      if (typeof val === 'string') {
        const parts = val.split('/');
        const first = parseInt(parts[0], 10);
        if (!isNaN(first)) return first;
      }
      return undefined;
    };

    const evalResult = RiskService.evaluate({
      spo2: vitals?.spo2 ? Number(vitals.spo2) : undefined,
      heartRate: vitals?.heart_rate || vitals?.heartRate ? Number(vitals.heart_rate || vitals.heartRate) : undefined,
      systolicBP: parseSystolicBP(vitals?.blood_pressure || vitals?.bloodPressure || vitals?.systolicBP),
      symptoms: symptoms ? [symptoms] : undefined,
    });

    const category = RiskService.categorize(evalResult.riskScore);
    const compositeTriageIndex = RiskService.computeCompositeTriageIndex(evalResult.riskScore, category, new Date().toISOString());

    return {
      riskScore: evalResult.riskScore,
      category,
      riskTier: category,
      compositeTriageIndex,
      factors: evalResult.factors,
      riskFactors: evalResult.factors,
    };
  }, [riskEvaluation, vitals, symptoms]);

  const handleBookToken = async (doc: DoctorSpec) => {
    setIsBooking(true);
    setSelectedDoctor(doc);

    const tokenNum = `MED-${Math.floor(1100 + Math.random() * 8900)}`;
    setTokenGenerated(tokenNum);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('patient_records').insert([
        {
          user_id: user?.id || null,
          patient_name: patient?.name || 'Anonymous Patient',
          phone_number: patient?.phone || patient?.mobile || 'N/A',
          symptoms: symptoms || 'Routine Checkup',
          kiosk_data: {
            ...patient,
            vitals: vitals || {},
            triage: triage || { department: doc.department, summary: 'Specialist consultation booked.' },
            risk_evaluation: activeRisk,
            doctor: doc.name,
            tokenNum,
            submitted_at: new Date().toISOString(),
          },
        },
      ]);
    } catch (e) {
      console.warn('Supabase booking sync notice:', e);
    } finally {
      setIsBooking(false);
    }
  };

  // Best single matching doctor for AI recommendation
  const recommendedDoctor = DOCTORS_DATABASE.find((d) =>
    d.department.toLowerCase().includes((triage?.department || 'General').toLowerCase())
  ) || DOCTORS_DATABASE[0];

  return (
    <div className="min-h-screen bg-slate-50 relative p-4 sm:p-8 flex flex-col items-center overflow-y-auto">
      {/* Background Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl space-y-6 my-4">
        {/* Top Header Card — NO Doctor Dashboard Button Before Booking */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Stethoscope size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                  Step 4: Specialist Selection
                </span>
                {patient && (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <User size={13} /> {patient.name} ({patient.sex}, {patient.age}y)
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Doctor Consultation Booking
              </h1>
            </div>
          </div>
        </div>

        {/* AI Recommended Department & Clinical Triage Summary */}
        <div className="bg-white border-2 border-teal-500/40 rounded-3xl p-6 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="text-teal-600" size={20} />
              <h3 className="font-black text-slate-900 text-base">
                AI Clinical Assessment Summary
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-extrabold border border-teal-200">
              Recommended: {triage?.department || 'General Physician / Internal Medicine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
            {triage?.summary || triage?.clinical_summary || 'Based on your reported symptoms and recorded vitals, AI recommends consultation with a General Physician / Specialist today.'}
          </p>

          {/* AI Clinical Risk & Priority Triage Badge */}
          {activeRisk && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Clinical Risk &amp; Priority Triage:
                </span>
                {activeRisk.compositeTriageIndex === 999.0 || activeRisk.riskScore >= 76 || activeRisk.category === 'CRITICAL' || activeRisk.riskTier === 'CRITICAL' ? (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white shadow-sm flex items-center gap-1.5">
                    <span>🚨 CRITICAL RISK — Emergency Priority</span>
                  </span>
                ) : activeRisk.riskScore >= 50 || activeRisk.category === 'HIGH' || activeRisk.riskTier === 'HIGH' ? (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1.5">
                    <span>⚠️ HIGH CLINICAL RISK</span>
                  </span>
                ) : activeRisk.riskScore >= 25 || activeRisk.category === 'MODERATE' || activeRisk.riskTier === 'MODERATE' ? (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-yellow-400 text-slate-900 shadow-sm flex items-center gap-1.5">
                    <span>⚡ MODERATE RISK</span>
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm flex items-center gap-1.5">
                    <span>✅ LOW RISK — Routine OPD</span>
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-700 font-bold flex-wrap gap-2">
                  <span>Risk Score: <strong className="text-slate-900">{activeRisk.riskScore}/100</strong></span>
                  <span>Composite Priority Index: <strong className="text-teal-700">{activeRisk.compositeTriageIndex === 999.0 ? '999.0 (Emergency Override)' : typeof activeRisk.compositeTriageIndex === 'number' ? activeRisk.compositeTriageIndex.toFixed(1) : activeRisk.compositeTriageIndex}</strong></span>
                </div>
                {(activeRisk.factors || activeRisk.riskFactors) && (activeRisk.factors || activeRisk.riskFactors).length > 0 ? (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Identified Clinical Risk Factors:</span>
                    {(activeRisk.factors || activeRisk.riskFactors).map((f: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-800">
                        <span className="text-amber-600">•</span>
                        <span><strong>[{f.parameter}] (+{f.impact} pts)</strong> {f.reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-slate-500 italic">No elevated clinical risk factors identified in recorded vitals or symptoms.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SCREEN 1: SUCCESS CONFIRMATION SCREEN (When Token Generated) */}
        {tokenGenerated ? (
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-3xl p-8 shadow-xl space-y-6 text-center animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              <CheckCircle2 size={16} className="text-white" />
              <span>Appointment &amp; Token Booked Successfully!</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tight">{tokenGenerated}</h2>
              <p className="text-sm font-semibold text-teal-100">
                Assigned Specialist: <strong>{selectedDoctor?.name}</strong>
              </p>
              <p className="text-xs text-teal-200">
                {selectedDoctor?.department} &bull; {selectedDoctor?.availability}
              </p>
            </div>

            <a
              href={generateWhatsAppLink({
                patientName: patient?.name || patient?.fullName || 'Patient',
                phoneNumber: patient?.phone || patient?.mobile || '',
                countryCode: patient?.countryCode || '91',
                appointmentDate: patient?.visitDate || new Date().toISOString().split('T')[0],
                tokenNumber: tokenGenerated,
                doctorName: selectedDoctor?.name,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 mb-3"
            >
              📲 Get Confirmation on WhatsApp
            </a>

            {/* Primary Action Button: Unlock & Navigate to Doctor Workstation */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={() => router.push('/doctor-dashboard')}
                data-testid="goto-doctor-dashboard-btn"
                className="py-4 px-8 rounded-2xl bg-white text-teal-950 font-black text-sm hover:bg-teal-50 transition cursor-pointer shadow-xl flex items-center justify-center gap-2"
              >
                <span>🩺 Go to Doctor Workstation / Dashboard →</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* SCREEN 2 & 3: CHOICE BRANCHING FLOW */
          <>
            {/* Initial State (selectionMode === 'none'): Render ONLY the 2 Choice Cards */}
            {selectionMode === 'none' && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 text-center">
                  Select How You Would Like to Book Your OPD Doctor:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Card 1: Ask AI to Recommend */}
                  <button
                    onClick={() => setSelectionMode('ai')}
                    data-testid="choice-ai-recommend"
                    className="p-6 rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer border border-teal-500"
                  >
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                        ✨
                      </div>
                      <h3 className="text-xl font-black tracking-tight">
                        Ask AI to Recommend Specialist
                      </h3>
                      <p className="text-xs text-teal-100 font-medium leading-relaxed">
                        Automatically assigns the highest rated available specialist tailored to your specific clinical symptoms.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center text-xs font-extrabold text-white gap-1">
                      <span>Recommend Specialist →</span>
                    </div>
                  </button>

                  {/* Card 2: Choose Doctor Manually */}
                  <button
                    onClick={() => setSelectionMode('manual')}
                    data-testid="choice-manual-doctor"
                    className="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-800 text-slate-900 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-bold">
                        👨‍⚕️
                      </div>
                      <h3 className="text-xl font-black tracking-tight">
                        Choose Doctor Manually
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Browse the complete list of all available OPD doctors across departments.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center text-xs font-extrabold text-slate-800 gap-1">
                      <span>View All OPD Doctors →</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* State 'ai': Render ONLY the 1 Single AI Recommended Doctor */}
            {selectionMode === 'ai' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-teal-700 flex items-center gap-1">
                    <Sparkles size={14} /> AI Recommended Specialist Match
                  </h3>
                  <button
                    onClick={() => setSelectionMode('none')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Change Choice
                  </button>
                </div>

                <div className="bg-white border-2 border-teal-500 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="w-16 h-16 rounded-2xl bg-teal-50 text-slate-800 flex items-center justify-center text-3xl border border-teal-100 shadow-xs">
                        {recommendedDoctor.image}
                      </span>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800">
                          ⭐ #1 Recommended Match
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-1">
                          {recommendedDoctor.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {recommendedDoctor.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-slate-700">
                    <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                      <Star size={13} className="text-amber-500 fill-amber-500" />
                      {recommendedDoctor.rating}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-1">
                      <Award size={13} className="text-teal-600" />
                      {recommendedDoctor.experience}
                    </span>
                  </div>

                  <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-1 pt-1">
                    <CheckCircle2 size={14} />
                    <span>{recommendedDoctor.availability}</span>
                  </div>

                  <button
                    onClick={() => handleBookToken(recommendedDoctor)}
                    disabled={isBooking}
                    data-testid={`book-token-btn-${recommendedDoctor.id}`}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm shadow-lg shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} />
                    <span>⚡ Book &amp; Generate Token</span>
                  </button>
                </div>
              </div>
            )}

            {/* State 'manual': Render Grid of All Available OPD Doctors */}
            {selectionMode === 'manual' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <UserCheck size={14} /> All Available OPD Doctors
                  </h3>
                  <button
                    onClick={() => setSelectionMode('none')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Change Choice
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DOCTORS_DATABASE.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white border border-slate-200 hover:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center text-2xl">
                            {doc.image}
                          </span>
                          <div>
                            <h4 className="font-black text-slate-900 text-base">{doc.name}</h4>
                            <p className="text-xs font-semibold text-slate-500">{doc.department}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-slate-600 pt-1">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                            {doc.rating}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-1">
                            <Award size={12} className="text-teal-600" />
                            {doc.experience}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                          <CheckCircle2 size={13} />
                          <span>{doc.availability}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleBookToken(doc)}
                        disabled={isBooking}
                        data-testid={`book-token-btn-${doc.id}`}
                        className="w-full mt-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Calendar size={14} />
                        <span>Book &amp; Generate Token</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
