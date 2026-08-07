"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Printer,
  CheckCircle2,
  X,
  Stethoscope,
  MapPin,
  Clock,
  AlertTriangle,
  QrCode,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { soundSynth } from "@/utils/soundEffects";
import { IntakeData } from "./MicVoiceIntake";

interface TokenResultModalProps {
  data: IntakeData | null;
  onClose: () => void;
}

export const TokenResultModal: React.FC<TokenResultModalProps> = ({
  data,
  onClose,
}) => {
  useEffect(() => {
    if (data) {
      soundSynth.playTokenGenerated();
      // Trigger subtle confetti burst
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#DC2626", "#EF4444", "#F87171", "#111111"],
        });
      } catch {
        // Ignore if canvas confetti fails
      }
    }
  }, [data]);

  if (!data) return null;

  const handlePrint = () => {
    soundSynth.playClick();
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#DC2626", "#ffffff", "#111111"],
      });
    } catch {
      // Ignore
    }
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotateX: 15 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="relative w-full max-w-md bg-white sketch-border p-6 rounded-3xl shadow-2xl my-8 text-neutral-900"
        >
          {/* Close Button */}
          <button
            onClick={() => {
              soundSynth.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full border-2 border-red-600 text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Badge */}
          <div className="text-center pb-4 mb-4 border-b-2 border-dashed border-red-600">
            <div className="inline-flex items-center space-x-1 text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DIGITAL OPD TOKEN GENERATED</span>
            </div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
              DocQueue AI Intake Slip
            </h3>
            <p className="text-xs text-neutral-500 font-semibold mt-0.5">
              City General Hospital • Main OPD Block
            </p>
          </div>

          {/* LARGE TOKEN NUMBER DISPLAY */}
          <div className="bg-red-50 border-2 border-red-600 p-4 rounded-2xl text-center mb-5 sketch-border-dashed relative">
            <span className="text-xs font-black uppercase tracking-wider text-red-600 block mb-1">
              YOUR SERVING TOKEN NUMBER
            </span>
            <div className="text-5xl font-black text-red-600 tracking-tight">
              #{data.tokenNumber}
            </div>
            <div className="mt-2 flex items-center justify-center space-x-2 text-xs font-bold text-neutral-700">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              <span>Est. Wait Time: ~3 Mins</span>
            </div>
          </div>

          {/* TRIAGING & SYMPTOM DETAILS */}
          <div className="space-y-3.5 mb-6 text-sm">
            {/* Department & Room */}
            <div className="bg-white border-2 border-neutral-900 p-3 rounded-xl flex items-start space-x-3">
              <Stethoscope className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Assigned Specialty & Room
                </span>
                <span className="font-extrabold text-neutral-900 text-base block">
                  {data.department}
                </span>
                <span className="text-xs font-semibold text-red-600 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{data.room}</span>
                </span>
              </div>
            </div>

            {/* Triage Priority Tag */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-600">Triage Status:</span>
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase flex items-center space-x-1 ${
                  data.triagePriority === "HIGH"
                    ? "bg-red-600 text-white"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {data.triagePriority === "HIGH" && (
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                )}
                {data.triagePriority === "HIGH" ? "Urgent Priority" : "Standard OPD Intake"}
              </span>
            </div>

            {/* Patient Speech Transcript */}
            <div className="border-l-4 border-red-600 pl-3 py-1">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                Recorded Voice Statement ({data.language})
              </span>
              <p className="text-xs font-medium text-neutral-800 italic mt-0.5">
                "{data.transcript}"
              </p>
            </div>

            {/* Extracted Symptoms */}
            <div>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                AI Extracted Symptoms:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.symptoms.map((symptom, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 px-2 py-0.5 rounded-md flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-red-600" />
                    <span>{symptom}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SIMULATED RED LINE-ART QR CODE */}
          <div className="flex items-center justify-between border-t-2 border-dashed border-red-600 pt-4 mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 border-2 border-red-600 rounded-lg bg-red-50/50">
                <QrCode className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-neutral-900 block">
                  Scan for Mobile Tracking
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  SMS sent to registered phone
                </span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="w-full bg-red-600 text-white font-extrabold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 sketch-border hover:bg-red-700 transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={() => {
                soundSynth.playClick();
                onClose();
              }}
              className="w-full bg-white text-neutral-900 border-2 border-neutral-900 font-extrabold text-sm py-2.5 px-4 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Done / Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
