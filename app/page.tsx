"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Doctor, Lang, PatientInfo, Step, TriageResult } from "@/lib/types";
import { Landing } from "@/components/landing/Landing";
import { LanguageGate } from "@/components/LanguageGate";
import { PatientForm } from "@/components/PatientForm";
import { TriageScreen } from "@/components/TriageScreen";
import { DoctorSelection } from "@/components/DoctorSelection";
import { TokenCard } from "@/components/TokenCard";
import { BackButton } from "@/components/BackButton";

// Order used for the persistent Back button — landing has no back target.
const STEP_ORDER: Step[] = ["landing", "language", "patient-form", "triage", "doctor-decision", "token"];

export default function Page() {
  const [step, setStep] = useState<Step>("landing");
  const [lang, setLang] = useState<Lang>("en");
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 1) setStep(STEP_ORDER[idx - 1]);
    else if (idx === 1) setStep("landing");
  };

  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center overflow-visible py-16 relative">
      {step !== "landing" && <BackButton lang={lang} onClick={goBack} />}

      <AnimatePresence mode="wait">
        {step === "landing" && (
          <motion.div key="landing" exit={{ opacity: 0 }}>
            <Landing onDone={() => setStep("language")} />
          </motion.div>
        )}

        {step === "language" && (
          <motion.div key="language" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LanguageGate
              onSelect={(l) => {
                setLang(l);
                setStep("patient-form");
              }}
            />
          </motion.div>
        )}

        {step === "patient-form" && (
          <motion.div key="patient-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PatientForm
              lang={lang}
              onSubmit={(p) => {
                setPatient(p);
                setStep("triage");
              }}
            />
          </motion.div>
        )}

        {step === "triage" && patient && (
          <motion.div key="triage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TriageScreen
              lang={lang}
              patient={patient}
              onComplete={(result) => {
                setTriage(result);
                setStep("doctor-decision");
              }}
            />
          </motion.div>
        )}

        {step === "doctor-decision" && triage && (
          <motion.div key="doctor-decision" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DoctorSelection
              department={triage.department}
              lang={lang}
              onConfirm={(d) => {
                setDoctor(d);
                setStep("token");
              }}
            />
          </motion.div>
        )}

        {step === "token" && patient && triage && doctor && (
          <motion.div key="token" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TokenCard lang={lang} patient={patient} triage={triage} doctor={doctor} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
