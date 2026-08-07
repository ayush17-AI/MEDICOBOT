'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Star,
  CheckCircle2,
  Calendar,
  Sparkles,
  Building,
  UserCheck,
  Award,
  ArrowRight,
  User,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

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
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSpec | null>(null);
  const [tokenGenerated, setTokenGenerated] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem('medicobot_patient');
      const v = sessionStorage.getItem('medicobot_vitals');
      const s = sessionStorage.getItem('medicobot_symptoms');
      const t = sessionStorage.getItem('medicobot_triage');

      if (p) setPatient(JSON.parse(p));
      if (v) setVitals(JSON.parse(v));
      if (s) setSymptoms(s);
      if (t) setTriage(JSON.parse(t));
    } catch (e) {
      console.warn('Session load notice:', e);
    }
  }, []);

  const displayedDoctors =
    activeTab === 'ai'
      ? DOCTORS_DATABASE.filter((d) =>
          d.rating.includes('4.9') || d.department.includes(triage?.department || 'General')
        )
      : DOCTORS_DATABASE;

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

  return (
    <div className="min-h-screen bg-slate-50 relative p-4 sm:p-8 flex flex-col items-center overflow-y-auto">
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl space-y-6 my-4">
        {/* Top Header Card */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Stethoscope size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                  Step 4: Doctor Specialist Selection
                </span>
                {patient && (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <User size={13} /> {patient.name} ({patient.sex}, {patient.age}y)
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Consultation Booking &amp; Token Generator
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
        </div>

        {/* Option Toggle Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ai')}
            data-testid="tab-ai-recommendation"
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles size={16} />
            <span>Ask AI to Recommend Specialist (Highest Rated &amp; Available)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            data-testid="tab-choose-doctor"
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck size={16} />
            <span>Choose Doctor Manually (All OPD Specialists)</span>
          </button>
        </div>

        {/* Token Confirmation Screen */}
        {tokenGenerated ? (
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-3xl p-8 shadow-xl space-y-4 text-center animate-fadeIn">
            <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-4 py-1.5 rounded-full inline-block">
              🎉 OPD Appointment Confirmed!
            </span>
            <h2 className="text-4xl font-black tracking-tight">{tokenGenerated}</h2>
            <div className="text-sm font-semibold space-y-1">
              <p>Assigned Doctor: <strong>{selectedDoctor?.name}</strong></p>
              <p className="text-xs text-teal-100">{selectedDoctor?.department} &bull; {selectedDoctor?.availability}</p>
            </div>
            <div className="pt-4 flex justify-center">
              <button
                onClick={() => router.push('/doctor-dashboard')}
                data-testid="goto-doctor-dashboard-btn"
                className="py-3.5 px-8 rounded-2xl bg-white text-teal-900 font-black text-sm hover:bg-teal-50 transition cursor-pointer shadow-lg flex items-center gap-2"
              >
                <span>Go to Doctor Workstation →</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Doctor List Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/95 border border-slate-200 hover:border-teal-500 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-2xl bg-teal-50 text-slate-700 flex items-center justify-center text-2xl border border-teal-100">
                        {doc.image}
                      </span>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{doc.name}</h4>
                        <p className="text-xs font-semibold text-slate-500">{doc.department}</p>
                      </div>
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
                  className="w-full mt-2 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Calendar size={14} />
                  <span>Book &amp; Generate Token</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
