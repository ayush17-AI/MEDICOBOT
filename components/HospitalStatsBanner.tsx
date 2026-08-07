"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, ShieldCheck, Languages, Zap } from "lucide-react";

export const HospitalStatsBanner: React.FC = () => {
  const stats = [
    {
      icon: Clock,
      value: "85%",
      label: "Reduction in OPD Queue Time",
      detail: "From 45 mins wait to under 5 mins",
    },
    {
      icon: Languages,
      value: "12+",
      label: "Indian Languages & Dialects",
      detail: "Hindi, Punjabi, Haryanvi, English & more",
    },
    {
      icon: Zap,
      value: "< 4s",
      label: "Average Token Generation Time",
      detail: "Instant specialty matching & room assignment",
    },
    {
      icon: ShieldCheck,
      value: "99.2%",
      label: "Triage Specialty Accuracy",
      detail: "AI verified against OPD clinical benchmarks",
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="bg-red-50/50 sketch-border-dashed border-2 border-red-600 p-6 md:p-8 rounded-3xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center p-3"
              >
                <div className="w-10 h-10 rounded-full bg-white border-2 border-red-600 flex items-center justify-center text-red-600 mb-2 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-red-600 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-neutral-900 mt-1">
                  {stat.label}
                </div>
                <div className="text-[11px] font-medium text-neutral-500 mt-0.5">
                  {stat.detail}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
