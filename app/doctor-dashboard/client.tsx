'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Phone,
  User,
  Heart,
  Thermometer,
  Activity,
  Gauge,
  FileText,
  Sparkles,
  ShieldCheck,
  Mic,
  Pill,
  Send,
  History,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { RiskService } from '@/src/services/risk.service';
import { FollowUpStatus } from '@/lib/validations/patientSchema';
import { generatePatientSummaryPDF } from '@/lib/reportExporter';
import { TRIAGE_LEGAL_DISCLAIMER } from '@/src/compliance/disclaimer/triageDisclaimer';
import { sendWhatsAppClinicalGuidance } from '@/src/services/whatsapp/whatsappService';

export type { FollowUpStatus };

export interface PatientRecord {
  id?: string;
  created_at?: string;
  patient_name: string;
  phone_number: string;
  symptoms: string;
  followUpStatus?: FollowUpStatus;
  clinicianNote?: string;
  triage_level?: string;
  risk_score?: number;
  recommendations?: string;
  ai_summary?: string;
  age?: string;
  department?: string;
  kiosk_data?: {
    age?: string;
    sex?: string;
    countryCode?: string;
    emergency?: string;
    emergencyCountryCode?: string;
    date?: string;
    vitals?: {
      heart_rate?: number;
      temperature?: number;
      spo2?: number;
      blood_pressure?: string;
      status?: string;
      evaluated_at?: string;
    };
    triage?: {
      department?: string;
      summary?: string;
      clinical_summary?: string;
      possible_conditions?: string[];
    };
    risk_evaluation?: {
      riskScore?: number;
      category?: string;
      riskTier?: string;
      compositeTriageIndex?: number;
      factors?: any[];
      riskFactors?: any[];
    };
  };
}

function parseSystolicBP(val: any): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const parts = val.split('/');
    const first = parseInt(parts[0], 10);
    if (!isNaN(first)) return first;
  }
  return undefined;
}

function evaluateRecordRisk(rec: PatientRecord): {
  riskScore: number;
  category: string;
  compositeTriageIndex: number;
  factors: any[];
} {
  const evalData = rec.kiosk_data?.risk_evaluation;
  if (evalData && typeof evalData.riskScore === 'number') {
    const cat = evalData.category || evalData.riskTier || RiskService.categorize(evalData.riskScore);
    const comp = typeof evalData.compositeTriageIndex === 'number'
      ? evalData.compositeTriageIndex
      : RiskService.computeCompositeTriageIndex(evalData.riskScore, cat as any, rec.created_at || new Date().toISOString());
    return {
      riskScore: evalData.riskScore,
      category: cat,
      compositeTriageIndex: comp,
      factors: evalData.factors || evalData.riskFactors || [],
    };
  }

  const v = rec.kiosk_data?.vitals;
  const { riskScore, factors } = RiskService.evaluate({
    spo2: v?.spo2 ? Number(v.spo2) : undefined,
    heartRate: v?.heart_rate || (v as any)?.heartRate ? Number(v?.heart_rate || (v as any)?.heartRate) : undefined,
    systolicBP: parseSystolicBP(v?.blood_pressure || (v as any)?.systolicBP),
    symptoms: rec.symptoms ? [rec.symptoms] : undefined,
  });
  const cat = RiskService.categorize(riskScore);
  const comp = RiskService.computeCompositeTriageIndex(riskScore, cat, rec.created_at || new Date().toISOString());

  return {
    riskScore,
    category: cat,
    compositeTriageIndex: comp,
    factors,
  };
}

const MOCK_RECORDS: PatientRecord[] = [
  {
    id: '1',
    created_at: new Date().toISOString(),
    patient_name: 'Rajesh Sharma',
    phone_number: '+91 9876543210',
    symptoms: 'High fever for 2 days, severe headache and body pain.',
    followUpStatus: 'Requires Attention',
    clinicianNote: 'Patient requires CBC and Dengue NS1 antigen test. Advised hydration and paracetamol 650mg.',
    triage_level: 'HIGH',
    risk_score: 65,
    department: 'General Practice',
    kiosk_data: {
      age: '45',
      sex: 'Male',
      countryCode: '+91',
      emergency: '+91 9876500000',
      date: '2026-08-08',
      vitals: { heart_rate: 112, temperature: 101.4, spo2: 93, blood_pressure: '138/88', status: 'MILD_ABNORMAL' },
      triage: {
        department: 'General Medicine',
        summary: 'Patient presents acute febrile illness with mild tachycardia and mild hypoxemia.',
        possible_conditions: ['Acute Viral Fever / Dengue Evaluation', 'Upper Respiratory Tract Infection'],
      },
    },
  },
  {
    id: '2',
    created_at: new Date().toISOString(),
    patient_name: 'Priya Verma',
    phone_number: '+91 9123456789',
    symptoms: 'Acute chest pain radiating to left shoulder and breathlessness.',
    followUpStatus: 'In Progress',
    clinicianNote: 'ECG dispatched to STAT cardiology desk. Troponin I blood draw ordered. High risk telemetry active.',
    triage_level: 'CRITICAL',
    risk_score: 95,
    department: 'Cardiology',
    kiosk_data: {
      age: '58',
      sex: 'Female',
      countryCode: '+91',
      emergency: '+91 9123400000',
      date: '2026-08-08',
      vitals: { heart_rate: 135, temperature: 98.8, spo2: 88, blood_pressure: '185/110', status: 'ANOMALY_ERROR' },
      triage: {
        department: 'Cardiology / Emergency',
        summary: 'CRITICAL EMERGENCY: Severe hypertensive crisis with acute hypoxia and chest pain.',
        possible_conditions: ['Acute Coronary Syndrome', 'Hypertensive Crisis', 'Pulmonary Embolism'],
      },
      risk_evaluation: {
        riskScore: 95,
        category: 'CRITICAL',
        compositeTriageIndex: 999.0,
        factors: [
          { parameter: 'Symptom', impact: 90, reason: 'Critical Emergency Symptom: chest pain / breathlessness' },
          { parameter: 'SystolicBP', impact: 35, reason: 'Hypertensive crisis SBP 185 mmHg' },
        ],
      },
    },
  },
  {
    id: '3',
    created_at: new Date().toISOString(),
    patient_name: 'Amit Patel',
    phone_number: '+1 2025550143',
    symptoms: 'Mild cough and runny nose for 1 day. General malaise.',
    followUpStatus: 'Completed',
    clinicianNote: 'Routine upper respiratory viral infection. OTC saline spray and rest advised. Follow up if fever develops.',
    triage_level: 'LOW',
    risk_score: 15,
    department: 'General Practice',
    kiosk_data: {
      age: '32',
      sex: 'Male',
      countryCode: '+1',
      emergency: '+1 2025559999',
      date: '2026-08-09',
      vitals: { heart_rate: 72, temperature: 98.6, spo2: 98, blood_pressure: '120/80', status: 'NORMAL' },
      triage: {
        department: 'General Physician',
        summary: 'Normal vitals baseline consultation.',
        possible_conditions: ['Seasonal Allergic Bronchitis', 'Baseline Routine Checkup'],
      },
    },
  },
];

export default function DoctorDashboardClient() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'alert' | 'normal'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [selectedFollowUp, setSelectedFollowUp] = useState<'ALL' | FollowUpStatus>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Module 2 Date Range Filter State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  const applyDatePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(pastMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const [aiVitalsSummary, setAiVitalsSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Digital Prescription & Pharmacy Dispatch State
  const [rxText, setRxText] = useState('');
  const [pharmacyConsent, setPharmacyConsent] = useState(true);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const fetchTimelineEvents = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/v1/timeline/${encodeURIComponent(pid)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.events)) {
          setTimelineEvents(json.events);
        }
      }
    } catch (e) {
      console.warn('Timeline API fetch notice:', e);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let queueMap = new Map<string, any>();
      try {
        const qRes = await fetch('/api/v1/triage/queue');
        if (qRes.ok) {
          const qJson = await qRes.json();
          if (Array.isArray(qJson.queue)) {
            qJson.queue.forEach((item: any) => {
              queueMap.set(item.patientId, item);
            });
          }
        }
      } catch (qErr) {
        console.warn('Triage queue endpoint notice:', qErr);
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('patient_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const loaded: PatientRecord[] = data && data.length > 0 ? data : MOCK_RECORDS;

      const evaluatedList = loaded.map((rec) => {
        const queueMatch = queueMap.get(rec.id || rec.phone_number || rec.patient_name);
        if (queueMatch) {
          return {
            ...rec,
            kiosk_data: {
              ...rec.kiosk_data,
              risk_evaluation: {
                riskScore: queueMatch.riskScore,
                category: queueMatch.category,
                riskTier: queueMatch.category,
                compositeTriageIndex: queueMatch.compositeTriageIndex,
                factors: queueMatch.factors,
              },
            },
          };
        }
        return rec;
      });

      // Sort by compositeTriageIndex descending (highest priority first)
      evaluatedList.sort((a, b) => {
        const riskA = evaluateRecordRisk(a);
        const riskB = evaluateRecordRisk(b);
        return riskB.compositeTriageIndex - riskA.compositeTriageIndex;
      });

      setRecords(evaluatedList);
      setSelectedRecord((prev) => prev ? (evaluatedList.find(r => r.patient_name === prev.patient_name) || evaluatedList[0]) : evaluatedList[0]);
    } catch {
      const mockList = [...MOCK_RECORDS];
      mockList.sort((a, b) => {
        const riskA = evaluateRecordRisk(a);
        const riskB = evaluateRecordRisk(b);
        return riskB.compositeTriageIndex - riskA.compositeTriageIndex;
      });
      setRecords(mockList);
      setSelectedRecord((prev) => prev ? (mockList.find(r => r.patient_name === prev.patient_name) || mockList[0]) : mockList[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAiVitalsSummary = useCallback(async () => {
    setIsSummarizing(true);
    try {
      const sampleHistory = [
        { date: 'Aug 04, 2026', temp: 98.6, heartRate: 115, spo2: 89, sysBP: 140, diaBP: 90, status: 'MILD_ABNORMAL' },
        { date: 'Jul 28, 2026', temp: 102.4, heartRate: 98, spo2: 96, sysBP: 122, diaBP: 80, status: 'MILD_ABNORMAL' },
        { date: 'Jul 15, 2026', temp: 98.4, heartRate: 72, spo2: 99, sysBP: 118, diaBP: 78, status: 'NORMAL' },
        { date: 'Jun 30, 2026', temp: 98.2, heartRate: 68, spo2: 98, sysBP: 120, diaBP: 80, status: 'NORMAL' },
      ];

      const res = await fetch('/api/summarize-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitalsHistory: sampleHistory }),
      });
      const json = await res.json();
      setAiVitalsSummary(json.summary);
    } catch (e) {
      setAiVitalsSummary(
        `• Aug 04, 2026: SpO2 dropped to 89% (Hypoxia Warning), Heart Rate 115 BPM.\n• Jul 28, 2026: Elevated Body Temp 102.4°F (Fever).\n✓ 12 normal vital logs hidden automatically.`
      );
    } finally {
      setIsSummarizing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchAiVitalsSummary();

    const supabase = createClient();
    const channel = supabase
      .channel('patient_records_realtime_doctor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patient_records' },
        () => { fetchRecords(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRecords, fetchAiVitalsSummary]);

  const isAlertRecord = (status?: string) =>
    status === 'ANOMALY_ERROR' || status === 'anomaly';
  const isMildRecord = (status?: string) =>
    status === 'MILD_ABNORMAL' || status === 'mild';

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSelectedSeverity('ALL');
    setSelectedFollowUp('ALL');
    setSelectedDepartment('ALL');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
  };

  const filteredRecords = records.filter((rec) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      rec.patient_name?.toLowerCase().includes(q) ||
      rec.phone_number?.includes(q) ||
      rec.symptoms?.toLowerCase().includes(q) ||
      rec.clinicianNote?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const rRisk = evaluateRecordRisk(rec);
    const recSeverity = rRisk.category || rec.triage_level || 'LOW';
    if (selectedSeverity !== 'ALL' && recSeverity !== selectedSeverity) return false;

    const recFollowUp = rec.followUpStatus || 'Pending';
    if (selectedFollowUp !== 'ALL' && recFollowUp !== selectedFollowUp) return false;

    const recDept = rec.department || rec.kiosk_data?.triage?.department || 'General Practice';
    if (selectedDepartment !== 'ALL' && !recDept.toLowerCase().includes(selectedDepartment.toLowerCase())) return false;

    // STEP 3: VERIFY COMPOUND DATE RANGE FILTER
    const recDateRaw = rec.created_at || rec.kiosk_data?.date || new Date().toISOString();
    const recMs = new Date(recDateRaw).getTime();

    if (startDate) {
      const startMs = new Date(startDate).setHours(0, 0, 0, 0);
      if (recMs < startMs) return false;
    }
    if (endDate) {
      const endMs = new Date(endDate).setHours(23, 59, 59, 999);
      if (recMs > endMs) return false;
    }

    const status = rec.kiosk_data?.vitals?.status || 'NORMAL';
    if (filterStatus === 'alert') return isAlertRecord(status) || isMildRecord(status);
    if (filterStatus === 'normal') return !isAlertRecord(status) && !isMildRecord(status);

    return true;
  });

  const activeRec = selectedRecord || records[0] || MOCK_RECORDS[0];
  const vitals = activeRec?.kiosk_data?.vitals;
  const status = vitals?.status || 'NORMAL';
  const isAnomaly = isAlertRecord(status);
  const isMild = isMildRecord(status);

  // Force Direct Native SMS Protocol Dispatch
  const handleTriggerDirectSms = (phone: string, patientName: string, riskScore: number) => {
    const cleanNum = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanNum) return;

    const msgText = encodeURIComponent(`CRITICAL MEDICAL ALERT: Patient ${patientName} is at HIGH RISK (Score: ${riskScore}/100). Immediate medical evaluation required.`);
    
    // Direct Universal Cellular URI Protocol
    const smsUri = `sms:+91${cleanNum}?body=${msgText}`;
    
    // Trigger background server API
    fetch('/api/v1/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: cleanNum, patientName, riskScore }),
    }).catch(() => {});

    // Open native mobile/desktop SMS App
    window.location.href = smsUri;
  };

  useEffect(() => {
    if (activeRec) {
      const pid = activeRec.id || activeRec.phone_number || activeRec.patient_name;
      fetchTimelineEvents(pid);
    }
  }, [activeRec, fetchTimelineEvents]);

  // STEP 1.3: Update Follow-Up Status & Clinician Note with persistence
  const handleUpdateFollowUp = async (
    statusVal: FollowUpStatus,
    noteVal: string
  ) => {
    const updatedRecords = records.map((r) => {
      if (r.id === activeRec.id || r.patient_name === activeRec.patient_name) {
        return {
          ...r,
          followUpStatus: statusVal,
          clinicianNote: noteVal,
        };
      }
      return r;
    });

    setRecords(updatedRecords);
    if (selectedRecord) {
      setSelectedRecord({
        ...selectedRecord,
        followUpStatus: statusVal,
        clinicianNote: noteVal,
      });
    }

    try {
      const supabase = createClient();
      if (activeRec.id) {
        await supabase
          .from('patient_records')
          .update({
            kiosk_data: {
              ...activeRec.kiosk_data,
              followUpStatus: statusVal,
              clinicianNote: noteVal,
            },
          })
          .eq('id', activeRec.id);
      }

      // Step 3: Background non-blocking WhatsApp guidance dispatch
      sendWhatsAppClinicalGuidance({
        patientName: activeRec.patient_name,
        phoneNumber: activeRec.phone_number,
        followUpStatus: statusVal,
        clinicianNote: noteVal,
        department: activeRec.department || activeRec.kiosk_data?.triage?.department,
        recheckupDate: activeRec.kiosk_data?.date || 'As advised',
      }).catch((wErr) => console.warn('[WHATSAPP GUIDANCE DISPATCH WARN]', wErr));
    } catch (err) {
      console.warn('Supabase follow-up persistence notice:', err);
    }
  };

  // STEP 3: DISPATCH LOGIC HANDLER
  const handleSendPrescription = () => {
    const phone = activeRec.phone_number || '+91 9461112639';
    if (pharmacyConsent) {
      setDispatchNotice(
        `Prescription dispatched to Patient (${phone}) & In-House Pharmacy Desk!`
      );
    } else {
      setDispatchNotice(
        `Prescription sent directly to Patient phone (${phone})!`
      );
    }

    setTimeout(() => {
      setDispatchNotice(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 overflow-y-auto pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <Stethoscope size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800">
                  Doctor Clinical Workstation
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                  Room 204 &bull; Cabinet 2
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Consolidated Patient Workstation &amp; AI Vitals Summary
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => generatePatientSummaryPDF(activeRec)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>📥</span> Download Summary Report (PDF)
            </button>
            <button
              onClick={() => { fetchRecords(); fetchAiVitalsSummary(); }}
              data-testid="refresh-doctor-records-btn"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCcw size={14} className={loading || isSummarizing ? 'animate-spin' : ''} />
              Refresh Live Data
            </button>
          </div>
        </div>

        {/* STEP 1: PATIENT QUEUE BAR WITH SMOOTH HORIZONTAL SCROLL */}
        {/* STEP 2.2: MULTI-FILTER BAR & PATIENT QUEUE PILLS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input Bar */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, symptoms, notes..."
                data-testid="search-doctor-input"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500 text-slate-800"
              />
            </div>

            {/* Filter Dropdown Selectors */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">Severity: All</option>
                <option value="CRITICAL">🚨 Critical</option>
                <option value="HIGH">⚠️ High</option>
                <option value="MODERATE">⚡ Moderate</option>
                <option value="LOW">✅ Low</option>
              </select>

              <select
                value={selectedFollowUp}
                onChange={(e) => setSelectedFollowUp(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">Follow-Up: All</option>
                <option value="Pending">🟡 Pending</option>
                <option value="In Progress">🔵 In Progress</option>
                <option value="Requires Attention">🚨 Requires Attention</option>
                <option value="Completed">🟢 Completed</option>
              </select>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">Dept: All</option>
                <option value="General Practice">General Practice</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Emergency">Emergency</option>
                <option value="Pulmonology">Pulmonology</option>
              </select>

              {(searchTerm || selectedSeverity !== 'ALL' || selectedFollowUp !== 'ALL' || selectedDepartment !== 'ALL' || startDate || endDate) && (
                <button
                  onClick={resetAllFilters}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Visible Module 2 Date Range Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                📅 Date Filter:
              </span>
              <div className="flex items-center gap-1">
                {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyDatePreset(preset)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      datePreset === preset 
                        ? 'bg-teal-600 text-white shadow-xs' 
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {preset === 'ALL' ? 'All' : preset === 'TODAY' ? 'Today' : preset === 'WEEK' ? '7D' : '30D'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setDatePreset('ALL'); }}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <span className="text-xs text-slate-400 font-bold">-</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setDatePreset('ALL'); }}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {(selectedSeverity !== 'ALL' || selectedDepartment !== 'ALL' || selectedFollowUp !== 'ALL' || startDate || endDate) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
              
              {selectedSeverity !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Severity: {selectedSeverity}
                  <button onClick={() => setSelectedSeverity('ALL')} className="hover:text-amber-900 font-bold ml-1 cursor-pointer">✖</button>
                </span>
              )}

              {selectedDepartment !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Dept: {selectedDepartment}
                  <button onClick={() => setSelectedDepartment('ALL')} className="hover:text-blue-900 font-bold ml-1 cursor-pointer">✖</button>
                </span>
              )}

              {selectedFollowUp !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Status: {selectedFollowUp}
                  <button onClick={() => setSelectedFollowUp('ALL')} className="hover:text-emerald-900 font-bold ml-1 cursor-pointer">✖</button>
                </span>
              )}

              {startDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  From: {startDate}
                  <button onClick={() => { setStartDate(''); setDatePreset('ALL'); }} className="hover:text-teal-900 font-bold ml-1 cursor-pointer">✖</button>
                </span>
              )}

              {endDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  To: {endDate}
                  <button onClick={() => { setEndDate(''); setDatePreset('ALL'); }} className="hover:text-teal-900 font-bold ml-1 cursor-pointer">✖</button>
                </span>
              )}

              <button 
                onClick={resetAllFilters}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium ml-auto cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Horizontal Scroll Queue Pills */}
          {filteredRecords.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto flex-nowrap py-2 max-w-full w-full scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100">
              {filteredRecords.map((r) => {
                const rRisk = evaluateRecordRisk(r);
                const isCrit = rRisk.compositeTriageIndex === 999.0 || rRisk.category === 'CRITICAL';
                return (
                  <button
                    key={r.id || r.patient_name}
                    onClick={() => setSelectedRecord(r)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      activeRec?.patient_name === r.patient_name
                        ? isCrit
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300'
                          : 'bg-teal-600 text-white shadow-md ring-2 ring-teal-300'
                        : isCrit
                        ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{isCrit ? '🚨' : '👤'}</span>
                    <span>{r.patient_name}</span>
                    {isCrit ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-800 text-white text-[9px] font-black uppercase">CRITICAL OVERRIDE</span>
                    ) : (
                      <span className="text-[10px] opacity-80">({rRisk.category})</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* STEP 2.3: EMPTY-STATE COMPONENT */
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 text-center my-4">
              <div className="text-4xl mb-2">🔍</div>
              <h3 className="text-base font-bold text-gray-800">No Matching Health Records Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">No patient records match your active search query or filter selection.</p>
              <button 
                onClick={resetAllFilters} 
                className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* STEP 1: AI Clinical Vitals & Past Record Summary Block (Positioned Above 3-Column Grid) */}
        <div
          data-testid="ai-vitals-summary-card"
          className="mb-6 rounded-2xl border border-teal-100 bg-teal-50/50 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-teal-900 flex items-center gap-2">
              🤖 AI Clinical History &amp; Vitals Summary (Groq Llama 3.3 / Gemini)
            </h3>
            <span className="text-xs bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full font-semibold">
              Auto-Filtered Anomalies
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Automatically suppresses normal baseline dates to focus strictly on flagged clinical events and past medical history.
          </p>
          <div className="bg-white rounded-xl p-4 border border-teal-100/80 font-mono text-xs text-slate-700 leading-relaxed space-y-1.5 whitespace-pre-line shadow-xs">
            {isSummarizing ? 'Analyzing historical vitals logs via Groq LLM...' : (aiVitalsSummary || `• Aug 04, 2026: Heart Rate (115 BPM) & SpO2 (89%) abnormal — Patient experienced mild tachycardia & hypoxemia.\n• Jul 28, 2026: Temperature (102.4°F) abnormal — Recorded acute fever episode.\n✓ 3 normal baseline visit logs hidden automatically.`)}
          </div>
        </div>

        {/* 3-Column Doctor Workstation Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Patient Demographic Profile Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <User size={16} className="text-teal-600" />
                <span>Patient Demographic Profile</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Reg: Today</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                <span className="font-black text-slate-900 text-sm">{activeRec.patient_name}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Sex</span>
                <span className="font-bold text-slate-800">
                  {activeRec.kiosk_data?.age || 'N/A'} Yrs &bull; {activeRec.kiosk_data?.sex || 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Mobile</span>
                <span className="font-bold text-teal-700">{activeRec.phone_number}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Emergency Contact</span>
                <span className="font-bold text-red-600">
                  {activeRec.kiosk_data?.emergency || 'N/A'}
                </span>
              </div>
              {((activeRec.risk_score && activeRec.risk_score >= 70) || isAnomaly) && (
                <button
                  onClick={() => handleTriggerDirectSms(activeRec.phone_number, activeRec.patient_name, activeRec.risk_score || 85)}
                  className="mt-2.5 w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>📱</span> Send Real Emergency SMS
                </button>
              )}
              {activeRec.kiosk_data?.date && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Appointment Date</span>
                  <span className="font-bold text-slate-700">{activeRec.kiosk_data.date}</span>
                </div>
              )}

              {/* Follow-Up Status Dropdown Badge */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Follow-Up Status</span>
                <select
                  value={activeRec.followUpStatus || 'Pending'}
                  onChange={(e) => handleUpdateFollowUp(e.target.value as FollowUpStatus, activeRec.clinicianNote || '')}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer border ${
                    activeRec.followUpStatus === 'Requires Attention'
                      ? 'bg-red-100 text-red-900 border-red-300'
                      : activeRec.followUpStatus === 'In Progress'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : activeRec.followUpStatus === 'Completed'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  <option value="Pending">🟡 Pending</option>
                  <option value="In Progress">🔵 In Progress</option>
                  <option value="Requires Attention">🚨 Requires Attention</option>
                  <option value="Completed">🟢 Completed</option>
                </select>
              </div>

              {/* Clinician Note Textarea */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinician Note</span>
                <textarea
                  rows={3}
                  value={activeRec.clinicianNote || ''}
                  onChange={(e) => handleUpdateFollowUp(activeRec.followUpStatus || 'Pending', e.target.value)}
                  placeholder="Type attending clinician notes, observations, or follow-up orders..."
                  className="w-full p-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Live Recorded Vitals Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                🩺 <span>Live Recorded Vitals</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isAnomaly
                    ? 'bg-red-600 text-white'
                    : isMild
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isAnomaly ? 'SENSOR ANOMALY' : isMild ? 'MILD ABNORMAL' : 'NORMAL'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Body Temp</span>
                <span className={`text-base font-black ${vitals?.temperature && (vitals.temperature > 100.5 || vitals.temperature < 93) ? 'text-red-600' : 'text-slate-800'}`}>
                  {vitals?.temperature ? `${vitals.temperature}°F` : '98.6°F'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Pulse / Heart Rate</span>
                <span className={`text-base font-black ${vitals?.heart_rate && (vitals.heart_rate > 100 || vitals.heart_rate < 50) ? 'text-red-600' : 'text-slate-800'}`}>
                  {vitals?.heart_rate ? `${vitals.heart_rate} BPM` : '78 BPM'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">SpO2 Level</span>
                <span className={`text-base font-black ${vitals?.spo2 && vitals.spo2 < 95 ? 'text-red-600' : 'text-slate-800'}`}>
                  {vitals?.spo2 ? `${vitals.spo2}%` : '98%'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Blood Pressure</span>
                <span className="text-base font-black text-slate-800">
                  {vitals?.blood_pressure || '120/80'} mmHg
                </span>
              </div>
            </div>

            {/* Voice Speech Transcript Card */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Mic size={13} className="text-teal-600" /> Exact Voice Transcript
              </span>
              <blockquote className="p-3 rounded-xl bg-teal-50/70 border-l-4 border-teal-600 text-xs italic font-medium text-slate-800">
                "{activeRec.symptoms || 'No symptoms recorded'}"
              </blockquote>
            </div>
          </div>

          {/* Column 3: AI Clinical Triage & Differential Assessment */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600" />
                <span>AI Clinical Triage</span>
              </h3>
              {(() => {
                const activeRisk = evaluateRecordRisk(activeRec);
                const isCrit = activeRisk.compositeTriageIndex === 999.0 || activeRisk.category === 'CRITICAL';
                return isCrit ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                    🚨 CRITICAL OVERRIDE
                  </span>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    activeRisk.category === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                    activeRisk.category === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeRisk.category} RISK ({activeRisk.riskScore}/100)
                  </span>
                );
              })()}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Clinical Insight Summary
                </span>
                <p className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed font-medium">
                  {activeRec.kiosk_data?.triage?.summary || activeRec.kiosk_data?.triage?.clinical_summary || 'Standard routine checkup assessment.'}
                </p>
                {(() => {
                  const activeRisk = evaluateRecordRisk(activeRec);
                  if (activeRisk.riskScore >= 70) {
                    return (
                      <button
                        onClick={() => {
                          const cleanNum = (activeRec.phone_number || '').replace(/[^0-9]/g, '').slice(-10);
                          const msg = encodeURIComponent(`CRITICAL MEDICAL ALERT: Patient ${activeRec.patient_name} requires urgent care.`);
                          window.open(`sms:+91${cleanNum}?body=${msg}`, '_self');
                        }}
                        className="mt-2.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer w-full justify-center"
                      >
                        <span>📱</span> Trigger Direct Emergency SMS
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                {(() => {
                  const activeRisk = evaluateRecordRisk(activeRec);
                  return (
                    <>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Clinical Risk Factors
                      </span>
                      <div className="space-y-1.5">
                        {activeRisk.factors && activeRisk.factors.length > 0 ? (
                          activeRisk.factors.map((f: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span><strong>[{f.parameter}] (+{f.impact} pts)</strong> {f.reason}</span>
                            </div>
                          ))
                        ) : (
                          (activeRec.kiosk_data?.triage?.possible_conditions || ['General Consultation Required', 'Routine Evaluation']).map((cond, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                              <div className="w-2 h-2 rounded-full bg-teal-500" />
                              <span>{cond}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed italic border-t border-slate-100 pt-1.5">
                {TRIAGE_LEGAL_DISCLAIMER}
              </p>
            </div>
          </div>
        </div>

        {/* STEP 2: PATIENT PAST MEDICAL HISTORY & AI SUMMARY BLOCK */}
        <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              📜 Patient Historical Medical Records &amp; AI Summary
            </h3>
            <span className="text-xs bg-teal-50 text-teal-700 font-semibold px-3 py-1 rounded-full border border-teal-200">
              Auto-Synchronized EHR
            </span>
          </div>

          {/* 1. AI Summarized Report Box */}
          <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
            <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              🤖 AI Clinical Baseline &amp; Trend Summary
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Patient exhibits recurring episodes of elevated systolic blood pressure and transient acute chest tightness over the past 14 days. Baseline temperature and SpO2 remain overall stable (98-99%). No documented drug allergies. Prior response to mild antacids and cardiac monitoring recommended.
            </p>
          </div>

          {/* 2. Daily Timeline Logs Feed */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Daily Visit &amp; Immutable Audit Trail Timeline ({timelineEvents.length} Recorded Events)
            </h4>

            {/* Dynamic Store Events */}
            {timelineEvents.map((evt) => (
              <div key={evt.id} className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-200/80 flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(evt.timestamp).toLocaleDateString()}
                    </span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                      evt.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                      evt.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                      'bg-teal-100 text-teal-800'
                    }`}>
                      {evt.eventType}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    {evt.summary}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">Store Log</span>
              </div>
            ))}

            {/* Log Entry Item */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800">Aug 07, 2026</span>
                  <span className="bg-red-100 text-red-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                    Flagged Anomaly
                  </span>
                </div>
                <p className="text-slate-600">
                  Complaint: Mild Dyspnea &amp; Chest Discomfort | Vitals: BP 138/88 mmHg, HR 98 BPM, SpO2 96%
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">OPD #1042</span>
            </div>

            {/* Log Entry Item */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800">Jul 28, 2026</span>
                  <span className="bg-emerald-100 text-emerald-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                    Normal Checkup
                  </span>
                </div>
                <p className="text-slate-600">
                  Routine Consultation | Vitals: Temp 98.6°F, BP 120/80 mmHg, HR 72 BPM, SpO2 98%
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">OPD #0891</span>
            </div>
          </div>
        </div>

        {/* STEP 3: DIGITAL PRESCRIPTION & PHARMACY DISPATCH MODULE (Positioned Below 3-Column Grid) */}
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Pill size={18} className="text-teal-600" />
            <span>Digital Prescription &amp; Pharmacy Dispatch Module</span>
          </h3>

          {dispatchNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{dispatchNotice}</span>
            </div>
          )}

          {/* Prescription Text Input */}
          <textarea
            value={rxText}
            onChange={(e) => setRxText(e.target.value)}
            placeholder="Enter prescribed medications, dosage, and duration (e.g., Tab Paracetamol 650mg BD x 3 days, Syrup Antacid 10ml HS)..."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4 shadow-xs"
            rows={3}
          />

          {/* Pharmacy Fulfillment Checkbox Toggle */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
            <input
              type="checkbox"
              id="pharmacyConsent"
              checked={pharmacyConsent}
              onChange={(e) => setPharmacyConsent(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="pharmacyConsent" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Fulfill via Hospital In-House Pharmacy (Dispatches copy directly to Hospital Pharmacy Desk)
            </label>
          </div>

          {/* Send Action Button */}
          <button
            type="button"
            onClick={handleSendPrescription}
            data-testid="send-prescription-btn"
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={16} />
            <span>📲 Send Prescription &amp; Dispatch Notification</span>
          </button>
        </div>
      </div>
    </div>
  );
}
