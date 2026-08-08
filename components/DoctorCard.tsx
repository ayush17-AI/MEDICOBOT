'use client';

import React, { useState } from 'react';

export interface DoctorCardProps {
  doctor: {
    id: string | number;
    name: string;
    department?: string;
    specialization?: string;
    rating?: string | number;
    experience?: string;
    availability?: string;
    image?: string;
  };
  onSelect?: (doctor: any) => void;
  isSelected?: boolean;
  index?: number;
}

export function DoctorCard({ doctor, onSelect, isSelected, index = 0 }: DoctorCardProps) {
  const [fluidRipples, setFluidRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  // High-Intensity Bright Neon Glow Classes
  const neonClasses = [
    'neon-glow-cyan',
    'neon-glow-magenta',
    'neon-glow-green',
    'neon-glow-purple',
  ];

  const docIdNum = typeof doctor.id === 'number' ? doctor.id : (index || 0);
  const neonStyle = neonClasses[docIdNum % neonClasses.length] || 'neon-glow-cyan';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { x, y, id: Date.now() + Math.random() };
    setFluidRipples((prev) => [...prev.slice(-3), newRipple]);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={() => onSelect && onSelect(doctor)}
      className={`relative overflow-hidden rounded-2xl bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer ${neonStyle} ${
        isSelected ? 'ring-4 ring-white shadow-2xl scale-[1.02]' : ''
      }`}
    >
      {/* White Fluid Surface Water Ripple Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl bg-white/40">
        {fluidRipples.map((r) => (
          <span
            key={r.id}
            className="white-fluid-ripple"
            style={{
              left: `${r.x}px`,
              top: `${r.y}px`,
              width: '120px',
              height: '120px',
            }}
          />
        ))}
      </div>

      {/* Doctor Info Content */}
      <div className="relative z-10 flex items-center gap-4 mb-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shadow-inner shrink-0">
          {doctor.image || '👨‍⚕️'}
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{doctor.name}</h3>
          <p className="text-xs text-slate-500 font-semibold">{doctor.department || doctor.specialization || 'General Physician'}</p>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 mb-4 text-xs font-bold flex-wrap">
        <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
          ⭐ {doctor.rating || '4.9 / 5.0'}
        </span>
        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
          🎗️ {doctor.experience || '10+ Yrs Exp'}
        </span>
      </div>

      {doctor.availability && (
        <p className="relative z-10 text-[11px] font-bold text-emerald-700 mb-3 flex items-center gap-1">
          <span>🟢</span> {doctor.availability}
        </p>
      )}

      <button className="relative z-10 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
        📅 Book &amp; Generate Token
      </button>
    </div>
  );
}
