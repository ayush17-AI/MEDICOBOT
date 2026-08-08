'use client';

import React from 'react';
import Link from 'next/link';

export function GlobalHeader() {
  return (
    <header className="w-full py-2.5 bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[100] flex items-center justify-center shadow-sm">
      <Link className="flex items-center justify-center hover:opacity-95 transition-opacity" href="/">
        {/* Render exact landing page logo graphic image asset */}
        <img 
          src="/medicobot-logo.png" 
          alt="MEDICOBOT" 
          className="h-9 md:h-11 w-auto object-contain drop-shadow-md"
          onError={(e) => {
            // Fallback if image file is stored under /logo.png
            (e.target as HTMLImageElement).src = '/logo.png';
          }}
        />
      </Link>
    </header>
  );
}
