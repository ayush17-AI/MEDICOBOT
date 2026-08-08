'use client';

import React, { useState, useEffect, useRef } from 'react';

export function PrescriptionModule({ patientId, activeRecord, onDispatchSuccess }: any) {
  const [prescriptionText, setPrescriptionText] = useState('');
  const [fulfillPharmacy, setFulfillPharmacy] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcriptionSource, setTranscriptionSource] = useState<'speech_to_text' | 'manual_input'>('manual_input');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Web Speech API Initialization
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setPrescriptionText((prev) => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + currentTranscript;
          });
          setTranscriptionSource('speech_to_text');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SPEECH RECOGNITION ERR]', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech recognition', e);
      }
    }
  };

  const handleDispatch = async () => {
    if (!prescriptionText.trim()) return;
    setIsSubmitting(true);

    const targetPhone = activeRecord?.phone_number || activeRecord?.phone || '9461112639';
    const targetName = activeRecord?.patient_name || activeRecord?.name || 'Ayush Naraniwal';

    try {
      const res = await fetch('/api/v1/prescription/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId || activeRecord?.id || 'PAT-DEMO-001',
          patientName: targetName,
          patientPhone: targetPhone,
          prescriptionText: prescriptionText,
          transcriptionSource: transcriptionSource,
          fulfillInHousePharmacy: fulfillPharmacy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Direct WhatsApp Dispatch Trigger
        if (data.whatsappDeepLink && typeof window !== 'undefined') {
          window.open(data.whatsappDeepLink, '_blank');
        }
        alert('✅ Prescription sent to In-House Pharmacy & WhatsApp!');
        if (onDispatchSuccess) onDispatchSuccess(data);
      }
    } catch (err) {
      console.error('Dispatch error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm my-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">Digital Prescription &amp; Pharmacy Dispatch</h3>
        <span className="text-[11px] font-semibold text-slate-400">
          Source: {transcriptionSource === 'speech_to_text' ? '🎤 Voice Dictation' : '⌨️ Manual Input'}
        </span>
      </div>

      {/* Zero Layout Shift Relative Textarea Wrapper */}
      <div className="relative w-full">
        <textarea
          value={prescriptionText}
          onChange={(e) => {
            setPrescriptionText(e.target.value);
            if (transcriptionSource === 'speech_to_text' && !isListening) {
              setTranscriptionSource('manual_input');
            }
          }}
          placeholder="Type or click mic icon to dictate prescription (e.g. Paracetamol 500mg BD for 5 days)..."
          rows={4}
          className="w-full p-3 pr-10 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
        />

        {/* Embedded Microphone Icon Button (Absolute Position Top-Right) */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={!isSupported}
          title={isSupported ? (isListening ? 'Stop Dictation' : 'Start Voice Dictation') : 'Voice dictation not supported on this browser'}
          aria-label="Toggle Voice Dictation"
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full transition-all cursor-pointer ${
            isListening
              ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-300'
              : isSupported
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {isListening ? (
            <span className="text-xs">🔴</span>
          ) : (
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Fulfillment Checkbox & Dispatch Action Button */}
      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={fulfillPharmacy}
            onChange={(e) => setFulfillPharmacy(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
          />
          <span className="text-xs text-slate-600 font-medium">Auto-Fulfill in In-House Pharmacy</span>
        </label>

        <button
          onClick={handleDispatch}
          disabled={isSubmitting || !prescriptionText.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Dispatching...' : 'Send Prescription & Dispatch Notification'}
        </button>
      </div>
    </div>
  );
}
