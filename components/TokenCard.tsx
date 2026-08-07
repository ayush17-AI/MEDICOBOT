"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Printer, MessageCircle } from "lucide-react";
import type { Doctor, Lang, PatientInfo, TriageResult } from "@/lib/types";
import { tr } from "@/lib/i18n";

const SEVERITY_STYLE: Record<TriageResult["severity"], string> = {
  Red: "bg-red-100 text-red-700 border-red-300",
  Yellow: "bg-amber-100 text-amber-700 border-amber-300",
  Green: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export function TokenCard({
  lang,
  patient,
  triage,
  doctor,
}: {
  lang: Lang;
  patient: PatientInfo;
  triage: TriageResult;
  doctor: Doctor;
}) {
  const tokenId = useMemo(() => {
    const deptCode = triage.department.slice(0, 4).toUpperCase();
    const num = Math.floor(100 + Math.random() * 900);
    return `MED-${deptCode}-${num}`;
  }, [triage.department]);

  const handlePrint = () => {
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    window.print();
  };

  const handleWhatsapp = () => {
    const text = encodeURIComponent(
      `MEDICOBOT Token ${tokenId}\nPatient: ${patient.fullName}\nDept: ${triage.department}\nDoctor: ${doctor.name}\nSeverity: ${triage.severity}\nEst. wait: ${doctor.waitTimeMins} min`
    );
    const phone = patient.contactNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  return (
    <motion.div
      className="w-full max-w-md flex flex-col gap-5 px-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{tr("yourToken", lang)}</p>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${SEVERITY_STYLE[triage.severity]}`}>
            {triage.severity}
          </span>
        </div>
        <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{tokenId}</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm border-t border-slate-100 pt-4">
          <span className="text-slate-400">{lang === "hi" ? "रोगी" : "Patient"}</span>
          <span className="text-slate-800 font-medium text-right">{patient.fullName}</span>
          <span className="text-slate-400">{lang === "hi" ? "विभाग" : "Department"}</span>
          <span className="text-slate-800 font-medium text-right">{triage.department}</span>
          <span className="text-slate-400">{lang === "hi" ? "डॉक्टर" : "Doctor"}</span>
          <span className="text-slate-800 font-medium text-right">{doctor.name}</span>
          <span className="text-slate-400">{tr("waitTime", lang)}</span>
          <span className="text-slate-800 font-medium text-right">
            {doctor.waitTimeMins} {tr("minsShort", lang)}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-semibold px-5 py-3 transition-colors"
        >
          <Printer size={16} />
          {tr("printToken", lang)}
        </button>
        <button
          onClick={handleWhatsapp}
          className="flex-1 flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-3 shadow-lg shadow-emerald-100 transition-colors"
        >
          <MessageCircle size={16} />
          {tr("sendWhatsapp", lang)}
        </button>
      </div>
    </motion.div>
  );
}
