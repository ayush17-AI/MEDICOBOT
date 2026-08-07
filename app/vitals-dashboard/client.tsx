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
  Sliders,
  Edit3,
} from 'lucide-react';
import {
  evaluateVitalsEngine,
  VitalsInput,
  VitalsEvalResult,
} from '@/lib/vitalsEngine';
import { createClient } from '@/utils/supabase/client';

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
  const [manualMode, setManualMode] = useState(false);

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

  const runSensorRead = (preset: 'normal' | 'mild' | 'anomaly' = 'normal') => {
    setIsReading(true);
    setTimeout(() => {
      let data: VitalsInput;
      if (preset === 'anomaly') {
        data = { temperature: 110.0, heartRate: 35, spo2: 40, sysBP: 210, diaBP: 130 };
      } else if (preset === 'mild') {
        data = { temperature: 101.4, heartRate: 112, spo2: 93, sysBP: 138, diaBP: 88 };
      } else {
        data = { temperature: 98.6, heartRate: 72, spo2: 98, sysBP: 120, diaBP: 80 };
      }
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

  const statusBadge = (status: string | undefined, message: string) => {
    const isErr = status === 'ANOMALY_ERROR';
    const isMild = status === 'MILD_ABNORMAL';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          isErr
            ? 'bg-red-200 text-red-900'
            : isMild
            ? 'bg-amber-200 text-amber-900'
            : 'bg-emerald-100 text-emerald-800'
        }`}
      >
        {isErr && <AlertTriangle size={12} />}
        {!isErr && !isMild && <CheckCircle2 size={12} />}
        {message}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 relative p-4 sm:p-8 flex flex-col items-center overflow-y-auto">
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl space-y-6 my-4">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          {/* Simulation & Manual Mode Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setManualMode(!manualMode)}
              data-testid="toggle-manual-input-btn"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Edit3 size={12} />
              {manualMode ? 'Hide Manual Inputs' : 'Edit Vitals Manually'}
            </button>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Sliders size={12} /> Test Presets:
            </span>
            <button
              onClick={() => runSensorRead('normal')}
              disabled={isReading}
              data-testid="preset-normal-btn"
              className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
            >
              Normal (98.6°F)
            </button>
            <button
              onClick={() => runSensorRead('mild')}
              disabled={isReading}
              data-testid="preset-mild-btn"
              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition-all cursor-pointer"
            >
              Mild Fever (101.4°F)
            </button>
            <button
              onClick={() => runSensorRead('anomaly')}
              disabled={isReading}
              data-testid="preset-anomaly-btn"
              className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold border border-red-300 transition-all cursor-pointer"
            >
              ⚠️ Anomaly (110°F)
            </button>
          </div>
        </div>

        {/* Anomaly Alert Banner */}
        {evalResult?.isAnomaly && (
          <div
            data-testid="vitals-anomaly-alert"
            className="p-6 rounded-3xl bg-red-600 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-red-700 animate-shake"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 rounded-full bg-white text-red-700 font-black text-xs uppercase tracking-wider mb-1">
                  Sensor Reading Anomaly Detected!
                </span>
                <p className="text-sm sm:text-base font-bold leading-snug">
                  Humanly Impossible Reading Detected (Possible Hardware Error). Please re-enter/re-read vitals.
                </p>
                <p className="text-xs text-red-100 mt-1 font-medium">
                  Readings cross biological bounds (e.g., Temp &gt; 105°F, SpO2 &lt; 50%, or HR &gt; 180 BPM). Please re-attach hardware sensors or correct manual inputs.
                </p>
              </div>
            </div>
            <button
              onClick={() => runSensorRead('normal')}
              data-testid="reread-sensors-btn"
              className="px-5 py-3 rounded-2xl bg-white text-red-700 hover:bg-red-50 font-black text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
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
            className={`p-5 rounded-3xl bg-white border transition-all ${
              evalResult?.temperature.status === 'ANOMALY_ERROR'
                ? 'border-2 border-red-500 bg-red-50/50 shadow-md shadow-red-200'
                : evalResult?.temperature.status === 'MILD_ABNORMAL'
                ? 'border-2 border-amber-400 bg-amber-50/50'
                : 'border-slate-200'
            }`}
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

            {/* Interactive Slider / Input */}
            <div className="mt-3 space-y-1">
              <input
                type="number"
                step="0.1"
                min="90"
                max="115"
                value={vitals.temperature}
                onChange={(e) => handleManualChange('temperature', parseFloat(e.target.value) || 98.6)}
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
            className={`p-5 rounded-3xl bg-white border transition-all ${
              evalResult?.heartRate.status === 'ANOMALY_ERROR'
                ? 'border-2 border-red-500 bg-red-50/50 shadow-md shadow-red-200'
                : evalResult?.heartRate.status === 'MILD_ABNORMAL'
                ? 'border-2 border-amber-400 bg-amber-50/50'
                : 'border-slate-200'
            }`}
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
                min="20"
                max="240"
                value={vitals.heartRate}
                onChange={(e) => handleManualChange('heartRate', parseInt(e.target.value) || 72)}
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
            className={`p-5 rounded-3xl bg-white border transition-all ${
              evalResult?.spo2.status === 'ANOMALY_ERROR'
                ? 'border-2 border-red-500 bg-red-50/50 shadow-md shadow-red-200'
                : evalResult?.spo2.status === 'MILD_ABNORMAL'
                ? 'border-2 border-amber-400 bg-amber-50/50'
                : 'border-slate-200'
            }`}
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
                min="30"
                max="100"
                value={vitals.spo2}
                onChange={(e) => handleManualChange('spo2', parseInt(e.target.value) || 98)}
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
            className={`p-5 rounded-3xl bg-white border transition-all ${
              evalResult?.bp.status === 'ANOMALY_ERROR'
                ? 'border-2 border-red-500 bg-red-50/50 shadow-md shadow-red-200'
                : evalResult?.bp.status === 'MILD_ABNORMAL'
                ? 'border-2 border-amber-400 bg-amber-50/50'
                : 'border-slate-200'
            }`}
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
                min="50"
                max="240"
                value={vitals.sysBP}
                onChange={(e) => handleManualChange('sysBP', parseInt(e.target.value) || 120)}
                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:border-teal-500 outline-none"
                placeholder="Sys"
                data-testid="input-sysbp"
              />
              <input
                type="number"
                min="30"
                max="150"
                value={vitals.diaBP}
                onChange={(e) => handleManualChange('diaBP', parseInt(e.target.value) || 80)}
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
            onClick={() => runSensorRead('normal')}
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
