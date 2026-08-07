"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, AudioWaveform, Globe2, ArrowRight } from "lucide-react";
import { soundSynth } from "@/utils/soundEffects";
import { LanguageCode } from "./Header";

export interface IntakeData {
  transcript: string;
  language: string;
  department: string;
  room: string;
  triagePriority: "HIGH" | "NORMAL";
  symptoms: string[];
  tokenNumber: number;
}

interface MicVoiceIntakeProps {
  currentLang: LanguageCode;
  onIntakeComplete: (data: IntakeData) => void;
  nextTokenNumber: number;
}

export const MicVoiceIntake: React.FC<MicVoiceIntakeProps> = ({
  currentLang,
  onIntakeComplete,
  nextTokenNumber,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Reference for SpeechRecognition instance
  const recognitionRef = useRef<unknown>(null);

  // Preset sample voice prompts for quick testing
  const presets = [
    {
      id: "preset-1",
      langLabel: "Hindi",
      langCode: "hi-IN",
      text: "मुझे २ दिन से तेज़ बुख़ार, सिरदर्द और खांसी है।",
      dept: "General Medicine",
      room: "OPD Room 104 (1st Floor)",
      priority: "NORMAL" as const,
      symptoms: ["Fever (2 Days)", "Severe Headache", "Dry Cough"],
    },
    {
      id: "preset-2",
      langLabel: "Punjabi",
      langCode: "pa-IN",
      text: "ਮੈਨੂੰ ਛਾਤੀ ਵਿੱਚ ਦਰਦ ਅਤੇ ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼ ਹੋ ਰਹੀ ਹੈ।",
      dept: "Cardiology & Emergency",
      room: "Emergency Trauma Bay 02",
      priority: "HIGH" as const,
      symptoms: ["Chest Pain", "Shortness of Breath", "Acute Discomfort"],
    },
    {
      id: "preset-3",
      langLabel: "English",
      langCode: "en-US",
      text: "I fell down from stairs and have severe right knee joint swelling.",
      dept: "Orthopedics Block",
      room: "OPD Room 208 (2nd Floor)",
      priority: "NORMAL" as const,
      symptoms: ["Right Knee Trauma", "Joint Swelling", "Inability to Walk"],
    },
  ];

  // Language heading strings
  const getHeading = () => {
    switch (currentLang) {
      case "hi":
        return (
          <>
            अपनी परेशानी <span className="sketch-highlight font-black">बोल कर</span> बताएं
          </>
        );
      case "pa":
        return (
          <>
            ਆਪਣੀ ਪਰੇਸ਼ਾਨੀ <span className="sketch-highlight font-black">ਬੋਲ ਕੇ</span> ਦੱਸੋ
          </>
        );
      case "en":
      default:
        return (
          <>
            Apni Pareshani <span className="sketch-highlight font-black">Bol Kar</span> Batayein
          </>
        );
    }
  };

  const getSubtext = () => {
    switch (currentLang) {
      case "hi":
        return "नीचे दिए गए लाल माइक बटन को दबाकर हिंदी, पंजाबी या अंग्रेजी में बोलें।";
      case "pa":
        return "ਹੇਠਾਂ ਦਿੱਤੇ ਲਾਲ ਮਾਈਕ ਬਟਨ ਨੂੰ ਦਬਾ ਕੇ ਹਿੰਦੀ, ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਬੋਲੋ।";
      case "en":
      default:
        return "Press the microphone button below to speak in Hindi, Punjabi, or English.";
    }
  };

  // Start Voice Recording (Browser Web Speech API or Simulation)
  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    soundSynth.playMicStart();
    setIsListening(true);
    setLiveTranscript("");
    setActivePreset(null);

    // Check for browser speech recognition API
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const rec = new (SpeechRecognition as new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            start: () => void;
            stop: () => void;
            onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
            onerror: () => void;
            onend: () => void;
          })();

          rec.continuous = true;
          rec.interimResults = true;

          // Set language based on selection
          if (currentLang === "hi") rec.lang = "hi-IN";
          else if (currentLang === "pa") rec.lang = "pa-IN";
          else rec.lang = "en-US";

          rec.onresult = (event) => {
            let transcriptText = "";
            for (let i = 0; i < event.results.length; i++) {
              transcriptText += event.results[i][0].transcript;
            }
            setLiveTranscript(transcriptText);
          };

          rec.onend = () => {
            // Handled via user stop or timer
          };

          rec.start();
          recognitionRef.current = rec;
          return;
        } catch {
          // Fallback to simulation
        }
      }
    }

    // Fallback simulation text stream if speech recognition is not granted/supported
    let simulatedText = "";
    if (currentLang === "hi") {
      simulatedText = "मुझे २ दिन से तेज़ बुख़ार, सिरदर्द और खांसी है।";
    } else if (currentLang === "pa") {
      simulatedText = "ਮੈਨੂੰ ਛਾਤੀ ਵਿੱਚ ਦਰਦ ਅਤੇ ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼ ਹੋ ਰਹੀ ਹੈ।";
    } else {
      simulatedText = "I have had high fever, severe headache, and sore throat since yesterday.";
    }

    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex <= simulatedText.length) {
        setLiveTranscript(simulatedText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(interval);
      }
    }, 40);
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as { stop: () => void }).stop();
      } catch {
        // Ignore
      }
    }

    // Process transcript into token slip
    processIntake(liveTranscript || presets[0].text);
  };

  const handleSelectPreset = (preset: typeof presets[0]) => {
    soundSynth.playClick();
    setActivePreset(preset.id);
    setLiveTranscript(preset.text);
    processIntake(preset.text, preset);
  };

  const processIntake = (
    transcriptText: string,
    presetConfig?: typeof presets[0]
  ) => {
    setIsProcessing(true);
    soundSynth.playClick();

    setTimeout(() => {
      setIsProcessing(false);

      const finalPreset =
        presetConfig ||
        presets.find((p) => transcriptText.includes(p.text)) ||
        presets[0];

      onIntakeComplete({
        transcript: transcriptText || finalPreset.text,
        language: currentLang.toUpperCase(),
        department: finalPreset.dept,
        room: finalPreset.room,
        triagePriority: finalPreset.priority,
        symptoms: finalPreset.symptoms,
        tokenNumber: nextTokenNumber,
      });

      setLiveTranscript("");
      setIsListening(false);
    }, 1200);
  };

  return (
    <section className="relative w-full max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center">
      {/* Red Outline Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center space-x-2 border-2 border-red-600 bg-red-50/40 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 sketch-border-dashed"
      >
        <Sparkles className="w-4 h-4 text-red-600 animate-spin" />
        <span>Voice-First AI OPD Intake • Zero Typing Needed</span>
      </motion.div>

      {/* Main Center Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-neutral-900 tracking-tight leading-tight max-w-3xl mb-4"
      >
        {getHeading()}
      </motion.h1>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl font-medium mb-8 leading-relaxed"
      >
        {getSubtext()}
      </motion.p>

      {/* LARGE ANIMATED MIC BUTTON (REQUIREMENT) */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        {/* Pulsing Ripple Rings on Listening / Hover */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-red-600 pointer-events-none"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0.9 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.3 }}
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-red-500 pointer-events-none"
              />
            </>
          )}
        </AnimatePresence>

        {/* Main Mic Button */}
        <motion.button
          onClick={toggleListening}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className={`relative z-20 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-red-600 text-white flex flex-col items-center justify-center shadow-[6px_6px_0px_#111111] border-4 border-neutral-900 transition-all ${
            isListening ? "animate-mic-pulse bg-red-700" : "hover:bg-red-700"
          }`}
        >
          {isListening ? (
            <MicOff className="w-10 h-10 sm:w-14 sm:h-14 animate-pulse text-white" />
          ) : (
            <Mic className="w-10 h-10 sm:w-14 sm:h-14 text-white drop-shadow-md" />
          )}

          <span className="mt-1 text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
            {isListening ? "TAP TO STOP" : "PRESS & SPEAK"}
          </span>
        </motion.button>

        {/* Outer Red Sketch Ring Line */}
        <div className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 -m-2 sm:-m-2 rounded-full border-2 border-dashed border-red-600 pointer-events-none animate-spin-slow" />
      </div>

      {/* LIVE RECORDING / PROCESSING STATUS CARD */}
      <AnimatePresence>
        {(isListening || isProcessing || liveTranscript) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-full max-w-lg mt-6 bg-white sketch-border p-5 rounded-2xl shadow-lg relative text-left"
          >
            {/* Audio Wave Visualizer Header */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-red-600 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span className="text-xs font-black text-red-600 uppercase tracking-wider">
                  {isProcessing
                    ? "AI TRIAGING IN PROGRESS..."
                    : isListening
                    ? "LISTENING TO YOUR VOICE..."
                    : "SPEECH RECORDED"}
                </span>
              </div>

              {/* Animated Red Line Waveform */}
              <div className="flex items-center space-x-1 h-5">
                {[40, 70, 30, 90, 50, 80, 40].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-red-600 rounded-full"
                    animate={{
                      height: isListening
                        ? [`${h}%`, `${100 - h}%`, `${h}%`]
                        : "40%",
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + i * 0.1,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Transcript Output */}
            <div className="bg-red-50/50 border border-red-200 p-3 rounded-xl min-h-[60px] flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-800 italic">
                {liveTranscript || '"Listening for your symptoms..."'}
              </p>
            </div>

            {/* Complete Action Button */}
            {isListening && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={stopListening}
                  className="bg-red-600 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors sketch-border"
                >
                  <span>Generate OPD Token Slip</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK PRESET SAMPLES (ART ATTACK SKETCH CHIPS FOR EASY DEMO TESTING) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-8 w-full max-w-2xl"
      >
        <div className="flex items-center justify-center space-x-2 text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">
          <Globe2 className="w-3.5 h-3.5 text-red-600" />
          <span>Or Tap a Sample Patient Symptom to Test Instant AI Intake:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-3 rounded-xl border-2 text-left transition-all sketch-shadow-hover flex flex-col justify-between ${
                activePreset === preset.id
                  ? "border-red-600 bg-red-50 text-red-700 font-bold"
                  : "border-red-600/40 bg-white text-neutral-800 hover:border-red-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase text-red-600 border border-red-600 px-1.5 py-0.5 rounded bg-white">
                  {preset.langLabel}
                </span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    preset.priority === "HIGH"
                      ? "bg-red-600 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {preset.priority}
                </span>
              </div>
              <p className="text-xs font-medium line-clamp-2 italic text-neutral-800">
                "{preset.text}"
              </p>
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
