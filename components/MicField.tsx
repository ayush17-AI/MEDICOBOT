"use client";

import { Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/lib/speech";
import type { Lang } from "@/lib/types";

export function MicField({
  label,
  value,
  onChange,
  lang,
  type = "text",
  placeholder,
  as = "input",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  type?: string;
  placeholder?: string;
  as?: "input" | "textarea";
}) {
  const { isListening, isSupported, startListening, stopListening } = useSpeechToText(lang);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening((finalText) => {
      onChange((value ? value + " " : "") + finalText);
    });
  };

  const Field = as === "textarea" ? "textarea" : "input";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      <div className="relative">
        <Field
          type={as === "input" ? type : undefined}
          rows={as === "textarea" ? 3 : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3498DB] focus:bg-white transition-colors resize-none"
        />
        {isSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label="Voice input"
            className={`absolute right-2 top-2.5 rounded-full p-1.5 transition-colors ${
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-[#3498DB] text-white hover:bg-[#2E86C1]"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
