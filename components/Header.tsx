"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Languages,
  Sparkles,
  Activity,
  ChevronDown,
} from "lucide-react";
import { soundSynth } from "@/utils/soundEffects";

export type LanguageCode = "hi" | "pa" | "en";

interface HeaderProps {
  currentLang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  tokenCount: number;
  onTokenIncrement: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  tokenCount,
  onTokenIncrement,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundSynth.setMuted(nextMuted);
    if (!nextMuted) {
      soundSynth.playClick();
    }
  };

  const handleLanguageSelect = (lang: LanguageCode) => {
    soundSynth.playClick();
    onLanguageChange(lang);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-red-600 px-4 md:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* LEFT: Animated Red Pulsing Dot + Logo */}
        <motion.div
          className="flex items-center space-x-3 cursor-pointer group"
          whileHover={{ scale: 1.02 }}
          onClick={() => soundSynth.playClick()}
        >
          {/* Animated Red Pulsing Indicator */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-4 h-4 rounded-full bg-red-600 animate-ping opacity-75" />
            <span className="relative w-3.5 h-3.5 rounded-full bg-red-600 border border-white shadow-sm" />
          </div>

          {/* Logo Brand Name & Art Sketch Badge */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
                DocQueue<span className="text-red-600">.AI</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-red-600 border-2 border-red-600 px-2 py-0.5 rounded-md sketch-border">
                OPD KIOSK
              </span>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500 tracking-wide">
              Voice-First OPD Intake System
            </span>
          </div>
        </motion.div>

        {/* RIGHT: Language Selector, Sound Switch & Live Token Serving Badge */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Language Selector Pills */}
          <div className="hidden sm:flex items-center space-x-1 border-2 border-red-600 rounded-lg p-0.5 bg-red-50/30">
            {(
              [
                { code: "hi", label: "हिन्दी" },
                { code: "pa", label: "ਪੰਜਾਬੀ" },
                { code: "en", label: "English" },
              ] as const
            ).map((lang) => {
              const active = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    active
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-neutral-700 hover:text-red-600 hover:bg-white"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            title={isMuted ? "Unmute Audio Effects" : "Mute Audio Effects"}
            className="p-2 rounded-lg border-2 border-red-600 text-red-600 hover:bg-red-50 transition-colors sketch-shadow-hover"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-neutral-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-red-600" />
            )}
          </button>

          {/* RIGHT BADGE: Live Token Serving Badge */}
          <div className="relative">
            <motion.button
              onClick={() => {
                soundSynth.playClick();
                setShowQueueDetails(!showQueueDetails);
              }}
              className="sketch-border bg-white text-red-600 px-3.5 py-1.5 rounded-lg flex items-center space-x-2 sketch-shadow-hover"
              whileTap={{ scale: 0.96 }}
            >
              <Activity className="w-4 h-4 text-red-600 animate-pulse" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                  Token Serving
                </span>
                <span className="text-base font-extrabold text-red-600 tracking-tight">
                  #{tokenCount}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-red-600 ml-1" />
            </motion.button>

            {/* Dropdown Live Queue Status Modal */}
            <AnimatePresence>
              {showQueueDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-white sketch-border p-4 rounded-xl shadow-xl z-50 text-left"
                >
                  <div className="flex items-center justify-between border-b-2 border-dashed border-red-600 pb-2 mb-3">
                    <span className="text-xs font-bold uppercase text-red-600 tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Live OPD Queue Status</span>
                    </span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Currently Serving:</span>
                      <span className="font-bold text-red-600">#{tokenCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Next In Line:</span>
                      <span className="font-bold text-neutral-900">
                        #{tokenCount + 1}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Avg Intake Speed:</span>
                      <span className="font-bold text-neutral-900">
                        3.4 sec / patient
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-600">General OPD Room:</span>
                      <span className="font-bold text-neutral-900">Room 104 (1st Fl)</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t-2 border-red-600 flex justify-between items-center">
                    <button
                      onClick={onTokenIncrement}
                      className="w-full bg-red-600 text-white font-bold text-xs py-1.5 rounded-md hover:bg-red-700 transition-colors text-center"
                    >
                      Simulate Next Token (+1)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
