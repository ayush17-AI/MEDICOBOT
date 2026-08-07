"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, User, Star, Clock } from "lucide-react";
import type { Department, Doctor, Lang } from "@/lib/types";
import { tr } from "@/lib/i18n";
import { useSpeak } from "@/lib/speech";
import { rankDoctors } from "@/lib/doctors";

type Mode = "decision" | "manual" | "ai";

function DoctorCard({ doctor, isBest, lang, onSelect }: { doctor: Doctor; isBest: boolean; lang: Lang; onSelect: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative text-left rounded-2xl border-2 p-5 bg-white transition-colors ${
        isBest ? "border-[#F39C12] shadow-lg shadow-amber-100" : "border-slate-200 hover:border-[#3498DB]"
      }`}
    >
      {isBest && (
        <span className="absolute -top-3 left-4 bg-[#F39C12] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          {tr("aiBestMatch", lang)}
        </span>
      )}
      <div className="flex items-center gap-3 mt-1">
        <div className="w-11 h-11 rounded-full bg-[#3498DB]/10 text-[#3498DB] font-bold flex items-center justify-center">
          {doctor.photoInitials}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{doctor.name}</p>
          <p className="text-xs text-slate-500">{doctor.department}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
        <span className="flex items-center gap-1"><Star size={14} className="text-amber-400" fill="currentColor" />{doctor.rating.toFixed(1)}</span>
        <span className="flex items-center gap-1"><Clock size={14} />{doctor.waitTimeMins} {tr("minsShort", lang)}</span>
      </div>
    </motion.button>
  );
}

export function DoctorSelection({
  department,
  lang,
  onConfirm,
}: {
  department: Department;
  lang: Lang;
  onConfirm: (doctor: Doctor) => void;
}) {
  const [mode, setMode] = useState<Mode>("decision");
  const speak = useSpeak();
  const ranked = rankDoctors(department);

  useEffect(() => {
    if (mode === "decision") speak(tr("howChooseDoctor", lang), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (mode === "decision") {
    return (
      <motion.div
        className="flex flex-col items-center gap-8 px-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 text-center max-w-md">
          {tr("howChooseDoctor", lang)}
        </h1>
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setMode("manual")}
            className="flex-1 rounded-3xl border-2 border-slate-200 hover:border-[#3498DB] bg-white shadow-md px-8 py-10 flex flex-col items-center gap-3 transition-colors"
          >
            <User size={32} className="text-[#3498DB]" />
            <span className="font-semibold text-slate-800">{tr("selectOwnDoctor", lang)}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setMode("ai")}
            className="flex-1 rounded-3xl border-2 border-slate-200 hover:border-[#F39C12] bg-white shadow-md px-8 py-10 flex flex-col items-center gap-3 transition-colors"
          >
            <Sparkles size={32} className="text-[#F39C12]" />
            <span className="font-semibold text-slate-800">{tr("askAiRecommend", lang)}</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const bestId = ranked[0]?.id;

  return (
    <motion.div
      className="w-full max-w-2xl grid sm:grid-cols-2 gap-4 px-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {ranked.map((doc) => (
        <DoctorCard
          key={doc.id}
          doctor={doc}
          lang={lang}
          isBest={mode === "ai" && doc.id === bestId}
          onSelect={() => onConfirm(doc)}
        />
      ))}
    </motion.div>
  );
}
