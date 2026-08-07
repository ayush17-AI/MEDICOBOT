"use client";

import React from "react";
import { Sparkles, ShieldCheck, Heart } from "lucide-react";
import { soundSynth } from "@/utils/soundEffects";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t-2 border-red-600 mt-12 py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Brand Info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-extrabold text-neutral-900 tracking-tight">
              DocQueue<span className="text-red-600">.AI</span>
            </span>
            <span className="text-[10px] font-bold uppercase text-red-600 border border-red-600 px-2 py-0.5 rounded">
              Art Attack Theme
            </span>
          </div>
          <p className="text-xs text-neutral-600 font-medium max-w-sm">
            Voice-First Multilingual AI OPD Intake Kiosk System for Hospitals & Clinics.
          </p>
        </div>

        {/* Middle Compliance Badge */}
        <div className="flex items-center space-x-2 border-2 border-dashed border-red-600 px-4 py-2 rounded-xl bg-red-50/40 text-xs font-bold text-red-700">
          <ShieldCheck className="w-4 h-4 text-red-600" />
          <span>ABDM & Ayushman Bharat Compliant Kiosk AI</span>
        </div>

        {/* Right Tagline */}
        <div className="flex items-center space-x-1 text-xs font-bold text-neutral-600">
          <span>Crafted with</span>
          <Heart className="w-4 h-4 text-red-600 fill-red-600 animate-pulse inline" />
          <span>for Indian Hospitals</span>
        </div>
      </div>
    </footer>
  );
};
