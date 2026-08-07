"use client";

import { motion } from "framer-motion";
import type { Lang } from "@/lib/types";

export function LanguageGate({ onSelect }: { onSelect: (lang: Lang) => void }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-10 px-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 text-center">
        Select Language / भाषा चुनें
      </h1>
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("en")}
          className="flex-1 rounded-3xl border-2 border-slate-200 hover:border-[#3498DB] bg-white shadow-md px-8 py-10 flex flex-col items-center gap-3 transition-colors"
        >
          <span className="text-4xl">🇬🇧</span>
          <span className="text-xl font-semibold text-slate-800">English</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("hi")}
          className="flex-1 rounded-3xl border-2 border-slate-200 hover:border-[#F39C12] bg-white shadow-md px-8 py-10 flex flex-col items-center gap-3 transition-colors"
        >
          <span className="text-4xl">🇮🇳</span>
          <span className="text-xl font-semibold text-slate-800">हिंदी</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
