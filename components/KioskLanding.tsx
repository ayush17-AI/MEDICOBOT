"use client";

import React, { useState } from "react";
import { Header, LanguageCode } from "./Header";
import { MicVoiceIntake, IntakeData } from "./MicVoiceIntake";
import { PopUpHospitalScenery } from "./PopUpHospitalScenery";
import { TokenResultModal } from "./TokenResultModal";
import { OPDFlowSteps } from "./OPDFlowSteps";
import { HospitalStatsBanner } from "./HospitalStatsBanner";
import { Footer } from "./Footer";

export default function KioskLanding() {
  const [currentLang, setCurrentLang] = useState<LanguageCode>("hi");
  const [tokenCount, setTokenCount] = useState<number>(42);
  const [intakeResult, setIntakeResult] = useState<IntakeData | null>(null);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLang(lang);
  };

  const handleTokenIncrement = () => {
    setTokenCount((prev) => prev + 1);
  };

  const handleIntakeComplete = (data: IntakeData) => {
    // Set generated token and update token count state
    setIntakeResult(data);
    setTokenCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between bg-grid-red selection:bg-red-600 selection:text-white">
      {/* HEADER COMPONENT */}
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        tokenCount={tokenCount}
        onTokenIncrement={handleTokenIncrement}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col items-center justify-start w-full">
        {/* CENTER CALL-TO-ACTION (MIC VOICE INTAKE) */}
        <MicVoiceIntake
          currentLang={currentLang}
          onIntakeComplete={handleIntakeComplete}
          nextTokenNumber={tokenCount + 1}
        />

        {/* HOSPITAL METRICS BANNER */}
        <HospitalStatsBanner />

        {/* OPD FLOW STEPS */}
        <OPDFlowSteps />

        {/* BOTTOM POP-UP AREA (THE KEY ANIMATION REQUIREMENT) */}
        <PopUpHospitalScenery
          onBuildingClick={() => {
            // Trigger quick intake demo when clicking building
          }}
        />
      </main>

      {/* FOOTER */}
      <Footer />

      {/* DIGITAL OPD TOKEN SLIP RESULT MODAL */}
      <TokenResultModal
        data={intakeResult}
        onClose={() => setIntakeResult(null)}
      />
    </div>
  );
}
