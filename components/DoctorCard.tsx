'use client';

import React, { useState } from 'react';

export interface DoctorCardProps {
  doctor: {
    id: string | number;
    name: string;
    department?: string;
    specialization?: string;
    rating?: string;
    experience?: string;
    availability?: string;
    image?: string;
  };
  onSelect?: (doctor: any) => void;
  isSelected?: boolean;
}

export function DoctorCard({ doctor, onSelect, isSelected }: DoctorCardProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  // Dynamic Neon Color Palette per doctor card
  const neonGlows = [
    'glow-teal border-teal-300',
    'glow-cyan border-cyan-300',
    'glow-purple border-purple-300',
    'glow-rose border-rose-300',
  ];

  const docIdNum = typeof doctor.id === 'number' ? doctor.id : String(doctor.id).charCodeAt(0) || 0;
  const glowClass = neonGlows[docIdNum % neonGlows.length] || 'glow-teal border-teal-300';

  const handleMouseMoveOrClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { x, y, id: Date.now() };

    setRipples((prev) => [...prev.slice(-4), newRipple]);
  };

  return (
    <div
      onClick={(e) => {
        handleMouseMoveOrClick(e);
        if (onSelect) onSelect(doctor);
      }}
      onMouseMove={handleMouseMoveOrClick}
      className={`relative overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-md ${glowClass} ${
        isSelected ? 'ring-4 ring-teal-500 shadow-xl' : ''
      }`}
    >
      {/* Ripple Canvas Overlay */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="animate-ripple"
          style={{
            left: r.x - 25,
            top: r.y - 25,
            width: 50,
            height: 50,
          }}
        />
      ))}

      {/* Doctor Info Card Content */}
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shadow-inner shrink-0">
          {doctor.image || '👨‍⚕️'}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{doctor.name}</h3>
          <p className="text-xs text-slate-500 font-medium">{doctor.department || doctor.specialization || 'General Physician'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs font-semibold flex-wrap">
        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
          ⭐ {doctor.rating || '4.9 / 5.0'}
        </span>
        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          🎗️ {doctor.experience || '10+ Yrs Exp'}
        </span>
      </div>

      {doctor.availability && (
        <p className="text-[11px] font-bold text-teal-700 mb-3 flex items-center gap-1">
          <span>🟢</span> {doctor.availability}
        </p>
      )}

      <button className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer">
        📅 Book &amp; Generate Token
      </button>
    </div>
  );
}
