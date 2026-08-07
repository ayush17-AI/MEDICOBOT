"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Stethoscope } from "lucide-react";
import type { Lang, PatientInfo, TriageResult } from "@/lib/types";
import { tr } from "@/lib/i18n";
import { useSpeak } from "@/lib/speech";

const SEVERITY_STYLE: Record<TriageResult["severity"], string> = {
  Red: "bg-red-100 text-red-700 border-red-300",
  Yellow: "bg-amber-100 text-amber-700 border-amber-300",
  Green: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export function TriageScreen({
  lang,
  patient,
  onComplete,
}: {
  lang: Lang;
  patient: PatientInfo;
  onComplete: (result: TriageResult) => void;
}) {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const speak = useSpeak();

  useEffect(() => {
    speak(tr("analyzing", lang), lang);
    const controller = new AbortController();
    fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptomText: patient.symptomText, age: patient.age, sex: patient.sex, lang }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: TriageResult) => setResult(data))
      .catch(() => setError(lang === "hi" ? "विश्लेषण विफल रहा। कृपया पुनः प्रयास करें।" : "Analysis failed. Please try again."));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <AlertTriangle className="text-red-500" size={36} />
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#3498DB]" size={40} />
        <p className="text-slate-500 font-medium">{tr("analyzing", lang)}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-xl flex flex-col gap-5 px-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3">
        <Stethoscope className="text-[#3498DB]" size={26} />
        <h1 className="text-xl font-bold text-slate-800">{result.department}</h1>
        <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full border ${SEVERITY_STYLE[result.severity]}`}>
          {result.severity}
        </span>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-500 mb-2">
          {lang === "hi" ? "संभावित कारक" : "Differential factors considered"}
        </p>
        <ul className="flex flex-col gap-1.5">
          {result.differential_factors.map((f, i) => (
            <li key={i} className="text-sm text-slate-700 flex gap-2">
              <span className="text-slate-400">•</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-slate-500 italic">{result.clinical_reasoning}</p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onComplete(result)}
        className="rounded-full bg-[#3498DB] hover:bg-[#2E86C1] text-white font-semibold px-6 py-3.5 shadow-lg shadow-blue-200 transition-colors"
      >
        {lang === "hi" ? "आगे बढ़ें →" : "Continue →"}
      </motion.button>
    </motion.div>
  );
}
