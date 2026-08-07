"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Lang, PatientInfo, Sex } from "@/lib/types";
import { tr } from "@/lib/i18n";
import { MicField } from "./MicField";

const SEX_OPTIONS: { value: Sex; label: { en: string; hi: string } }[] = [
  { value: "male", label: { en: "Male", hi: "पुरुष" } },
  { value: "female", label: { en: "Female", hi: "महिला" } },
  { value: "intersex", label: { en: "Intersex", hi: "इंटरसेक्स" } },
  { value: "other", label: { en: "Other", hi: "अन्य" } },
];

export function PatientForm({
  lang,
  onSubmit,
}: {
  lang: Lang;
  onSubmit: (patient: PatientInfo) => void;
}) {
  const [form, setForm] = useState<PatientInfo>({
    fullName: "",
    age: "",
    sex: "",
    contactNumber: "",
    emergencyContact: "",
    date: "",
    symptomText: "",
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, date: new Date().toISOString().slice(0, 10) }));
  }, []);

  const isValid =
    form.fullName.trim() &&
    form.age.trim() &&
    form.sex &&
    form.contactNumber.trim() &&
    form.symptomText.trim();

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit(form);
  };

  return (
    <motion.div
      className="w-full max-w-2xl flex flex-col gap-6 px-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-2xl font-bold text-slate-800 text-center">{tr("patientInfoTitle", lang)}</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <MicField label={tr("fullName", lang)} value={form.fullName} lang={lang} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} />
        <MicField label={tr("age", lang)} value={form.age} lang={lang} type="number" onChange={(v) => setForm((f) => ({ ...f, age: v }))} />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">{tr("sex", lang)}</label>
        <div className="flex flex-wrap gap-2">
          {SEX_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, sex: opt.value }))}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                form.sex === opt.value
                  ? "bg-[#3498DB] text-white border-[#3498DB]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#3498DB]"
              }`}
            >
              {opt.label[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <MicField label={tr("contactNumber", lang)} value={form.contactNumber} lang={lang} type="tel" onChange={(v) => setForm((f) => ({ ...f, contactNumber: v }))} />
        <MicField label={tr("emergencyContact", lang)} value={form.emergencyContact} lang={lang} type="tel" onChange={(v) => setForm((f) => ({ ...f, emergencyContact: v }))} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-600">{tr("date", lang)}</label>
        <input
          value={form.date}
          readOnly
          className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
        />
      </div>

      <MicField
        label={tr("symptoms", lang)}
        value={form.symptomText}
        lang={lang}
        as="textarea"
        placeholder={lang === "hi" ? "उदाहरण: छाती में दर्द, दो दिनों से" : "e.g. chest pain, for the last two days"}
        onChange={(v) => setForm((f) => ({ ...f, symptomText: v }))}
      />

      {touched && !isValid && (
        <p className="text-sm text-red-500 text-center">{tr("required", lang)}</p>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        className="rounded-full bg-[#3498DB] hover:bg-[#2E86C1] text-white font-semibold px-6 py-3.5 shadow-lg shadow-blue-200 transition-colors"
      >
        {tr("proceedToTriage", lang)}
      </motion.button>
    </motion.div>
  );
}
