'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  patientInfoSchema,
  COUNTRY_PHONE_CONFIG,
} from '@/lib/validations/patientSchema';
import { z } from 'zod';

// Derive the type directly from the schema to stay in sync
type FormValues = z.infer<typeof patientInfoSchema>;

export default function PatientInfoClient() {
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(patientInfoSchema) as any,
    defaultValues: {
      fullName: '',
      countryCode: '+91',
      phoneNumber: '',
    },
    mode: 'onTouched',
  });

  const selectedCountryCode = watch('countryCode') || '+91';
  const currentCountryConfig =
    COUNTRY_PHONE_CONFIG[selectedCountryCode] || COUNTRY_PHONE_CONFIG['+91'];

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setGlobalError(null);
    const payload = {
      name: data.fullName.trim(),
      age: String(data.age),
      sex: data.gender,
      countryCode: data.countryCode,
      mobile: data.phoneNumber,
      phone: `${data.countryCode} ${data.phoneNumber}`,
      date: new Date().toISOString().split('T')[0],
    };
    sessionStorage.setItem('medicobot_patient', JSON.stringify(payload));
    router.push('/vitals-dashboard');
  };

  const onError = () => {
    setGlobalError(
      'Please fill all required personal details correctly before proceeding.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Glow */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 my-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <User size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Patient Personal Information
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Step 1: Enter details before hardware sensor vitals check
            </p>
          </div>
        </div>

        {/* Global Warning Banner */}
        {globalError && (
          <div
            data-testid="global-warning-banner"
            className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-500 text-red-800 flex items-start gap-3 shadow-sm"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
            <div className="text-xs sm:text-sm font-bold">{globalError}</div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit, onError)}
          noValidate
          className="space-y-5"
        >
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Full Name <span className="text-red-500 font-black">*</span>
            </label>
            <input
              {...register('fullName')}
              type="text"
              placeholder="e.g. Rahul Sharma"
              data-testid="fullName-input"
              data-invalid={errors.fullName ? 'true' : 'false'}
              className={`w-full px-4 py-3 text-sm rounded-xl font-medium transition-all outline-none ${
                errors.fullName
                  ? 'border-2 border-red-500 bg-red-50 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500'
                  : 'border border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
              }`}
            />
            {errors.fullName && (
              <p
                data-testid="error-message-fullName"
                className="mt-1 text-xs font-bold text-red-600 flex items-center gap-1"
              >
                <AlertCircle size={12} />
                {errors.fullName.message as string}
              </p>
            )}
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Age (Years) <span className="text-red-500 font-black">*</span>
              </label>
              <input
                {...register('age')}
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 34"
                data-testid="age-input"
                data-invalid={errors.age ? 'true' : 'false'}
                className={`w-full px-4 py-3 text-sm rounded-xl font-medium transition-all outline-none ${
                  errors.age
                    ? 'border-2 border-red-500 bg-red-50 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500'
                    : 'border border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                }`}
              />
              {errors.age && (
                <p
                  data-testid="error-message-age"
                  className="mt-1 text-xs font-bold text-red-600 flex items-center gap-1"
                >
                  <AlertCircle size={12} />
                  {errors.age.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Gender <span className="text-red-500 font-black">*</span>
              </label>
              <select
                {...register('gender')}
                data-testid="gender-select"
                data-invalid={errors.gender ? 'true' : 'false'}
                className={`w-full px-4 py-3 text-sm rounded-xl font-medium transition-all outline-none ${
                  errors.gender
                    ? 'border-2 border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-500'
                    : 'border border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                }`}
              >
                <option value="">-- Select Gender --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p
                  data-testid="error-message-gender"
                  className="mt-1 text-xs font-bold text-red-600 flex items-center gap-1"
                >
                  <AlertCircle size={12} />
                  {errors.gender.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Country Code & Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Mobile Number <span className="text-red-500 font-black">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <select
                  {...register('countryCode')}
                  data-testid="country-code-select"
                  className="w-full px-3 py-3 text-sm rounded-xl font-bold bg-slate-100 border border-slate-300 text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                >
                  {Object.entries(COUNTRY_PHONE_CONFIG).map(([code, cfg]) => (
                    <option key={code} value={code}>
                      {cfg.flag} {code} ({cfg.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  {...register('phoneNumber')}
                  type="tel"
                  placeholder={`${currentCountryConfig.digits}-digit number`}
                  data-testid="phoneNumber-input"
                  data-invalid={errors.phoneNumber ? 'true' : 'false'}
                  className={`w-full px-4 py-3 text-sm rounded-xl font-medium transition-all outline-none ${
                    errors.phoneNumber
                      ? 'border-2 border-red-500 bg-red-50 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500'
                      : 'border border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                  }`}
                />
              </div>
            </div>
            {errors.phoneNumber ? (
              <p
                data-testid="error-message-phoneNumber"
                className="mt-1 text-xs font-bold text-red-600 flex items-center gap-1"
              >
                <AlertCircle size={12} />
                {errors.phoneNumber.message as string}
              </p>
            ) : (
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Requires {currentCountryConfig.digits} digits for{' '}
                {currentCountryConfig.name} ({selectedCountryCode})
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              data-testid="submit-patient-btn"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Hardware Vitals Check</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <ShieldCheck size={16} className="text-teal-600" />
          <span>Encrypted Session • Verified HIPAA Compliance</span>
        </div>
      </div>
    </div>
  );
}
