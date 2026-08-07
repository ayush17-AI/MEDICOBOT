"use client";

import { ChevronLeft } from "lucide-react";
import type { Lang } from "@/lib/types";
import { tr } from "@/lib/i18n";

export function BackButton({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-5 left-5 z-20 flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium text-sm bg-white/80 backdrop-blur px-3 py-2 rounded-full shadow-sm border border-slate-200 transition-colors"
    >
      <ChevronLeft size={16} />
      {tr("back", lang)}
    </button>
  );
}
