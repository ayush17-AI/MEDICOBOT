'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface PatientRecord {
  id?: string;
  created_at?: string;
  patient_name: string;
  phone_number: string;
  symptoms: string;
  kiosk_data?: {
    age?: string;
    sex?: string;
    vitals?: {
      heart_rate?: number;
      temperature?: number;
      spo2?: number;
      blood_pressure?: string;
      status?: string;
    };
  };
}

const MOCK_RECORDS: PatientRecord[] = [
  {
    id: '1',
    created_at: new Date().toISOString(),
    patient_name: 'Rajesh Sharma',
    phone_number: '+91 9876543210',
    symptoms: 'High fever, severe headache and body pain.',
    kiosk_data: {
      age: '42',
      sex: 'Male',
      vitals: { heart_rate: 114, temperature: 102.4, spo2: 94, blood_pressure: '142/90', status: 'MILD_ABNORMAL' },
    },
  },
  {
    id: '2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    patient_name: 'Anjali Verma',
    phone_number: '+91 9123456789',
    symptoms: 'Extreme chills — critical sensor alert.',
    kiosk_data: {
      age: '29',
      sex: 'Female',
      vitals: { heart_rate: 36, temperature: 108.5, spo2: 48, blood_pressure: '210/125', status: 'ANOMALY_ERROR' },
    },
  },
  {
    id: '3',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    patient_name: 'David Smith',
    phone_number: '+1 2025550143',
    symptoms: 'Routine checkup, mild seasonal cough.',
    kiosk_data: {
      age: '55',
      sex: 'Male',
      vitals: { heart_rate: 72, temperature: 98.6, spo2: 98, blood_pressure: '120/80', status: 'NORMAL' },
    },
  },
];

export default function DoctorDashboardClient() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'alert' | 'normal'>('all');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('patient_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data && data.length > 0 ? data : MOCK_RECORDS);
    } catch {
      setRecords(MOCK_RECORDS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();

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
  }, [fetchRecords]);

  const isAlertRecord = (status?: string) =>
    status === 'ANOMALY_ERROR' || status === 'anomaly';
  const isMildRecord = (status?: string) =>
    status === 'MILD_ABNORMAL' || status === 'mild';

  const filteredRecords = records.filter((rec) => {
    const status = rec.kiosk_data?.vitals?.status || 'NORMAL';
    const matchesSearch =
      rec.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.phone_number.includes(searchTerm) ||
      rec.symptoms.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'alert') return isAlertRecord(status) || isMildRecord(status);
    if (filterStatus === 'normal') return !isAlertRecord(status) && !isMildRecord(status);
    return true;
  });

  const alertCount = records.filter((r) =>
    isAlertRecord(r.kiosk_data?.vitals?.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <Stethoscope size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800">
                  Doctor Clinical Portal
                </span>
                {alertCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                    ⚠️ {alertCount} Flagged Vitals Alerts
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Real-Time Patient Vitals Monitor
              </h1>
            </div>
          </div>
          <button
            onClick={fetchRecords}
            data-testid="refresh-doctor-records-btn"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Live Data
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3.5 top-3 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient name, phone, symptoms..."
              data-testid="search-doctor-input"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Filter size={13} /> Filter:
            </span>
            {(['all', 'alert', 'normal'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                data-testid={`filter-${f}-btn`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                  filterStatus === f
                    ? f === 'alert'
                      ? 'bg-red-600 text-white'
                      : f === 'normal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white'
                    : f === 'alert'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    : f === 'normal'
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? `All (${records.length})` : f === 'alert' ? `Alerts (${records.filter(r => isAlertRecord(r.kiosk_data?.vitals?.status) || isMildRecord(r.kiosk_data?.vitals?.status)).length})` : 'Normal'}
              </button>
            ))}
          </div>
        </div>

        {/* Vitals Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table
              data-testid="doctor-vitals-table"
              className="w-full text-left border-collapse"
            >
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-4">Temp (°F)</th>
                  <th className="py-4 px-4">Heart Rate</th>
                  <th className="py-4 px-4">SpO2</th>
                  <th className="py-4 px-4">BP (mmHg)</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Symptoms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400 font-semibold"
                    >
                      No matching patient records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, i) => {
                    const vitals = rec.kiosk_data?.vitals;
                    const status = vitals?.status || 'NORMAL';
                    const isAnomaly = isAlertRecord(status);
                    const isMild = isMildRecord(status);

                    return (
                      <tr
                        key={rec.id || i}
                        data-alert-flagged={isAnomaly ? 'true' : 'false'}
                        className={`transition-colors ${
                          isAnomaly
                            ? 'bg-red-500/10 hover:bg-red-500/15 border-l-4 border-red-600 font-bold'
                            : isMild
                            ? 'bg-amber-50 hover:bg-amber-100/60 border-l-4 border-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs">
                              👨‍⚕️
                            </span>
                            <div>
                              <div>{rec.patient_name}</div>
                              <div className="text-[11px] font-medium text-slate-500">
                                {rec.kiosk_data?.sex || 'N/A'},{' '}
                                {rec.kiosk_data?.age || 'N/A'}y •{' '}
                                {rec.phone_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-extrabold">
                          <span
                            className={
                              vitals?.temperature &&
                              (vitals.temperature > 100.5 ||
                                vitals.temperature < 93.0)
                                ? 'text-red-700 font-black'
                                : 'text-slate-800'
                            }
                          >
                            {vitals?.temperature
                              ? `${vitals.temperature}°F`
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-extrabold">
                          <span
                            className={
                              vitals?.heart_rate &&
                              (vitals.heart_rate > 100 ||
                                vitals.heart_rate < 50)
                                ? 'text-red-700 font-black'
                                : 'text-slate-800'
                            }
                          >
                            {vitals?.heart_rate
                              ? `${vitals.heart_rate} BPM`
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-extrabold">
                          <span
                            className={
                              vitals?.spo2 && vitals.spo2 < 95
                                ? 'text-red-700 font-black'
                                : 'text-slate-800'
                            }
                          >
                            {vitals?.spo2 ? `${vitals.spo2}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-slate-800">
                          {vitals?.blood_pressure || 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isAnomaly
                                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                : isMild
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {(isAnomaly || isMild) && (
                              <AlertTriangle size={11} />
                            )}
                            {!isAnomaly && !isMild && (
                              <CheckCircle2 size={11} />
                            )}
                            {isAnomaly
                              ? 'ANOMALY ALERT'
                              : isMild
                              ? 'MILD ABNORMAL'
                              : 'NORMAL'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-slate-600 max-w-xs truncate">
                          {rec.symptoms || 'No symptoms recorded'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
