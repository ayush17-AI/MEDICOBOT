'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Thermometer,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Cpu,
  User,
} from 'lucide-react';
import {
  evaluateVitalsEngine,
  VitalsInput,
  VitalsEvalResult,
  VitalsStatus,
} from '@/lib/vitalsEngine';
import { createClient } from '@/utils/supabase/client';
import { logTimelineEvent } from '@/lib/timelineLogger';
import { GlobalHeader } from '@/components/GlobalHeader';

export default function VitalsDashboardClient() {
  const router = useRouter();

  const [patient, setPatient] = useState<{
    name: string;
    age: string;
    sex: string;
    phone: string;
  } | null>(null);

  // Manual & Simulated Vitals state initialized to normal default
  const [vitals, setVitals] = useState<VitalsInput>({
    temperature: 98.6,
    heartRate: 72,
    spo2: 98,
    sysBP: 120,
    diaBP: 80,
  });

  const [evalResult, setEvalResult] = useState<VitalsEvalResult>(() =>
    evaluateVitalsEngine({
      temperature: 98.6,
      heartRate: 72,
      spo2: 98,
      sysBP: 120,
      diaBP: 80,
    })
  );

  const [isReading, setIsReading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('medicobot_patient');
      if (cached) setPatient(JSON.parse(cached));
    } catch (e) {
      console.warn('Failed to load patient session:', e);
    }
  }, []);

  const updateVitals = (newVitals: VitalsInput) => {
    setVitals(newVitals);
    setEvalResult(evaluateVitalsEngine(newVitals));
  };

  const handleManualChange = (field: keyof VitalsInput, value: number) => {
    const next = { ...vitals, [field]: value };
    updateVitals(next);
  };

  const runSensorRead = () => {
    setIsReading(true);
    setTimeout(() => {
      const data: VitalsInput = {
        temperature: 98.6,
        heartRate: 72,
        spo2: 98,
        sysBP: 120,
        diaBP: 80,
      };
      updateVitals(data);
      setIsReading(false);
    }, 600);
  };

  const handleProceed = async () => {
    if (!evalResult || evalResult.isAnomaly || !vitals) return;
    setIsSyncing(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const vitalsData = {
        heart_rate: vitals.heartRate,
        temperature: vitals.temperature,
        spo2: vitals.spo2,
        blood_pressure: `${vitals.sysBP}/${vitals.diaBP}`,
        status: evalResult.overallStatus,
        evaluated_at: new Date().toISOString(),
      };
      sessionStorage.setItem('medicobot_vitals', JSON.stringify(vitalsData));

      const pid = patient?.phone || patient?.name || 'anonymous_patient';
      logTimelineEvent({
        patientId: pid,
        eventType: 'VITALS_SUBMITTED',
        summary: `Vitals Checked: ${vitals.temperature}°F, ${vitals.heartRate} BPM, SpO2 ${vitals.spo2}%, BP ${vitals.sysBP}/${vitals.diaBP}`,
        details: vitalsData,
        severity: evalResult.overallStatus === 'SEVERE' ? 'HIGH' : evalResult.overallStatus === 'INVALID' ? 'CRITICAL' : 'LOW',
      });

      if (user && patient) {
        await supabase.from('patient_records').insert([
          {
            user_id: user.id,
            patient_name: patient.name,
            phone_number: patient.phone,
            symptoms: 'Pending AI Symptom Evaluation',
            kiosk_data: { ...patient, vitals: vitalsData },
          },
        ]);
      }
    } catch (err) {
      console.warn('Supabase sync notice:', err);
    } finally {
      setIsSyncing(false);
      router.push('/symptoms');
    }
  };

  const canProceed = Boolean(
    vitals && evalResult && !evalResult.isAnomaly && !isSyncing
  );

  const statusBadge = (status: VitalsStatus, message: string) => {
    let colorClasses = 'bg-slate-200 text-slate-800 border border-slate-300';
    let icon = <AlertTriangle size={12} />;

    if (status === 'NORMAL') {
      colorClasses = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      icon = <CheckCircle2 size={12} />;
    } else if (status === 'MEDIUM') {
      colorClasses = 'bg-amber-100 text-amber-900 border border-amber-300';
      icon = <AlertTriangle size={12} />;
    } else if (status === 'SEVERE') {
      colorClasses = 'bg-red-100 text-red-900 border border-red-300';
      icon = <AlertTriangle size={12} />;
    } else if (status === 'INVALID') {
      colorClasses = 'bg-gray-200 text-gray-800 border border-gray-400 font-extrabold';
      icon = <AlertTriangle size={12} className="text-gray-600" />;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold leading-tight ${colorClasses}`}
      >
        {icon}
        {message}
      </span>
    );
  };

  const cardBorderClass = (status: VitalsStatus | undefined) => {
    if (status === 'INVALID') return 'border-2 border-gray-400 bg-gray-50/70 shadow-md shadow-gray-200';
    if (status === 'SEVERE') return 'border-2 border-red-500 bg-red-50/50 shadow-md shadow-red-200';
    if (status === 'MEDIUM') return 'border-2 border-amber-400 bg-amber-50/50 shadow-sm';
    return 'border-slate-200 bg-white';
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col items-center pb-12 overflow-y-auto">
      <GlobalHeader />
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl space-y-6 my-4">
        {/* Header - Clean Top Banner */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Cpu size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                  Hardware Sensor &amp; Manual Vitals Engine
                </span>
                {patient && (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <User size={13} /> {patient.name} ({patient.sex},{' '}
                    {patient.age}y)
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Dedicated Vitals Read &amp; Threshold Dashboard
              </h1>
            </div>
          </div>
        </div>

        {/* Anomaly Alert Banner */}
        {evalResult?.isAnomaly && (
          <div
            data-testid="vitals-anomaly-alert"
            className="p-6 rounded-3xl bg-gray-800 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-gray-900 animate-shake"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 rounded-full bg-red-500 text-white font-black text-xs uppercase tracking-wider mb-1">
                  ⚠️ Invalid Biological Reading Detected
                </span>
                <p className="text-sm sm:text-base font-bold leading-snug">
                  {evalResult.alertMessage || 'Invalid Biological Reading Detected (Out of Human Bounds). Please correct inputs or re-read hardware sensors.'}
                </p>
                <p className="text-xs text-gray-300 mt-1 font-medium">
                  One or more vitals cross human biological bounds. Navigation is blocked until a valid reading is entered.
                </p>
              </div>
            </div>
            <button
              onClick={runSensorRead}
              data-testid="reread-sensors-btn"
              className="px-5 py-3 rounded-2xl bg-white text-gray-900 hover:bg-gray-100 font-black text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw
                size={16}
                className={isReading ? 'animate-spin' : ''}
              />
              Re-Read Hardware Sensors
            </button>
          </div>
        )}

        {/* 4 Vitals Cards Grid with Interactive Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature Card */}
          <div
            data-testid="vital-card-temperature"
            className={`p-5 rounded-3xl border transition-all ${cardBorderClass(evalResult?.temperature.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Body Temp (°F)
              </span>
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Thermometer size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {vitals.temperature}°F
            </div>

            {/* Interactive Input */}
            <div className="mt-3 space-y-1">
              <input
                type="number"
                step="0.1"
                min="80"
                max="120"
                value={vitals.temperature}
                onChange={(e) => handleManualChange('temperature', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:border-teal-500 outline-none"
                placeholder="Temp °F"
                data-testid="input-temperature"
              />
            </div>

            <div className="mt-3">
              {statusBadge(
                evalResult.temperature.status,
                evalResult.temperature.message
              )}
            </div>
          </div>

          {/* Heart Rate Card */}
          <div
            data-testid="vital-card-heartrate"
            className={`p-5 rounded-3xl border transition-all ${cardBorderClass(evalResult?.heartRate.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Heart Rate (BPM)
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Heart size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {vitals.heartRate} BPM
            </div>

            {/* Interactive Input */}
            <div className="mt-3 space-y-1">
              <input
                type="number"
                min="10"
                max="250"
                value={vitals.heartRate}
                onChange={(e) => handleManualChange('heartRate', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:border-teal-500 outline-none"
                placeholder="Heart Rate BPM"
                data-testid="input-heartrate"
              />
            </div>

            <div className="mt-3">
              {statusBadge(
                evalResult.heartRate.status,
                evalResult.heartRate.message
              )}
            </div>
          </div>

          {/* SpO2 Card */}
          <div
            data-testid="vital-card-spo2"
            className={`p-5 rounded-3xl border transition-all ${cardBorderClass(evalResult?.spo2.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                SpO2 Oxygen (%)
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Activity size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {vitals.spo2}%
            </div>

            {/* Interactive Input */}
            <div className="mt-3 space-y-1">
              <input
                type="number"
                min="0"
                max="100"
                value={vitals.spo2}
                onChange={(e) => handleManualChange('spo2', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:border-teal-500 outline-none"
                placeholder="SpO2 %"
                data-testid="input-spo2"
              />
            </div>

            <div className="mt-3">
              {statusBadge(evalResult.spo2.status, evalResult.spo2.message)}
            </div>
          </div>

          {/* Blood Pressure Card */}
          <div
            data-testid="vital-card-bp"
            className={`p-5 rounded-3xl border transition-all ${cardBorderClass(evalResult?.bp.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Blood Pressure (mmHg)
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Gauge size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {vitals.sysBP}/{vitals.diaBP}
            </div>

            {/* Interactive BP Inputs */}
            <div className="mt-3 grid grid-cols-2 gap-1">
              <input
                type="number"
                min="40"
                max="300"
                value={vitals.sysBP}
                onChange={(e) => handleManualChange('sysBP', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:border-teal-500 outline-none"
                placeholder="Sys"
                data-testid="input-sysbp"
              />
              <input
                type="number"
                min="20"
                max="200"
                value={vitals.diaBP}
                onChange={(e) => handleManualChange('diaBP', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:border-teal-500 outline-none"
                placeholder="Dia"
                data-testid="input-diabp"
              />
            </div>

            <div className="mt-3">
              {statusBadge(evalResult.bp.status, evalResult.bp.message)}
            </div>
          </div>
        </div>

        {/* Proceed Gate Footer */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={runSensorRead}
            disabled={isReading}
            data-testid="read-sensors-btn"
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw
              size={18}
              className={isReading ? 'animate-spin' : ''}
            />
            {isReading ? 'Reading Sensors...' : 'Read Hardware Sensors'}
          </button>

          <button
            onClick={handleProceed}
            disabled={!canProceed}
            data-can-proceed={canProceed ? 'true' : 'false'}
            data-testid="proceed-to-symptoms-btn"
            className={`w-full sm:w-auto py-3.5 px-8 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
              !canProceed
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-600/25 cursor-pointer'
            }`}
          >
            {isSyncing ? 'Syncing Record...' : 'Proceed to Symptom Analysis'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
