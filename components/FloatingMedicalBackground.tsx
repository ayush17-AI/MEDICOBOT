'use client';

import React from 'react';
import { Stethoscope, Syringe, Pill, HeartPulse, Thermometer, Activity, ShieldPlus } from 'lucide-react';

export default function FloatingMedicalBackground() {
  const badges = [
    { icon: Stethoscope, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', pos: 'top-[12%] left-[10%]', anim: 'animate-float-slow' },
    { icon: Syringe, color: 'bg-purple-100 text-purple-600 border-purple-200', pos: 'top-[15%] right-[15%]', anim: 'animate-float-medium' },
    { icon: Pill, color: 'bg-indigo-100 text-indigo-600 border-indigo-200', pos: 'bottom-[20%] left-[12%]', anim: 'animate-float-fast' },
    { icon: HeartPulse, color: 'bg-blue-100 text-blue-600 border-blue-200', pos: 'top-[45%] left-[5%]', anim: 'animate-float-medium' },
    { icon: Thermometer, color: 'bg-rose-100 text-rose-600 border-rose-200', pos: 'bottom-[15%] right-[10%]', anim: 'animate-float-slow' },
    { icon: Activity, color: 'bg-teal-100 text-teal-600 border-teal-200', pos: 'bottom-[35%] right-[18%]', anim: 'animate-float-fast' },
    { icon: ShieldPlus, color: 'bg-amber-100 text-amber-600 border-amber-200', pos: 'top-[28%] right-[8%]', anim: 'animate-float-slow' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Background Pastel Polka Dots/Circles */}
      <div className="absolute top-10 left-1/4 w-32 h-32 bg-purple-100/50 rounded-full blur-xl" />
      <div className="absolute bottom-10 right-1/4 w-40 h-40 bg-teal-100/50 rounded-full blur-xl" />
      
      {/* Floating Badges */}
      {badges.map((b, i) => {
        const IconComponent = b.icon;
        return (
          <div
            key={i}
            className={`absolute ${b.pos} ${b.anim} flex items-center justify-center p-4 md:p-5 rounded-full shadow-lg shadow-purple-900/5 border-2 border-white/80 backdrop-blur-sm ${b.color}`}
          >
            <IconComponent className="w-8 h-8 md:w-10 md:h-10 stroke-[2.2]"/>
          </div>
        );
      })}
    </div>
  );
}
