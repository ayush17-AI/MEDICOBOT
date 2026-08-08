'use client';

import React from 'react';
import Link from 'next/link';

export function GlobalHeader() {
  return (
    <header className="w-full py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 flex items-center justify-center shadow-sm">
      <Link className="hover:opacity-90 transition-opacity" href="/">
        {/* Styled Logo matching landing page graphic */}
        <div className="flex items-center gap-1 font-extrabold text-xl tracking-wider select-none">
          <span className="text-emerald-600 border-2 border-emerald-500 rounded-lg px-1.5 py-0.5 bg-emerald-50 shadow-sm">M</span>
          <span className="text-amber-500 border-2 border-amber-400 rounded-lg px-1.5 py-0.5 bg-amber-50 shadow-sm">E</span>
          <span className="text-yellow-600 border-2 border-yellow-500 rounded-lg px-1.5 py-0.5 bg-yellow-50 shadow-sm">D</span>
          <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-xs shadow-sm">i</span>
          <span className="text-red-500 border-2 border-red-400 rounded-lg px-1.5 py-0.5 bg-red-50 shadow-sm">C</span>
          <span className="text-purple-600 border-2 border-purple-400 rounded-lg px-1.5 py-0.5 bg-purple-50 shadow-sm">O</span>
          <span className="text-sky-500 border-2 border-sky-400 rounded-lg px-1.5 py-0.5 bg-sky-50 shadow-sm">B</span>
          <span className="text-orange-600 border-2 border-orange-400 rounded-lg px-1.5 py-0.5 bg-orange-50 shadow-sm">O</span>
          <span className="text-emerald-600 border-2 border-emerald-500 rounded-lg px-1.5 py-0.5 bg-emerald-50 shadow-sm">T</span>
        </div>
      </Link>
    </header>
  );
}
