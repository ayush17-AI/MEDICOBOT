"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mic, BrainCircuit, Ticket, Stethoscope, ArrowRight } from "lucide-react";
import { soundSynth } from "@/utils/soundEffects";

export const OPDFlowSteps: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: Mic,
      title: "Speak in Native Dialect",
      desc: "Patient presses the red mic button on the hospital kiosk and describes symptoms in Hindi, Punjabi, or English.",
    },
    {
      number: "02",
      icon: BrainCircuit,
      title: "Instant AI Triaging",
      desc: "Medical NLP extracts symptoms, determines urgency priority, and matches the correct medical department.",
    },
    {
      number: "03",
      icon: Ticket,
      title: "Printed Token & QR",
      desc: "Issues digital OPD ticket with room number, floor directions, and real-time live position tracking on mobile.",
    },
    {
      number: "04",
      icon: Stethoscope,
      title: "Direct Doctor Consult",
      desc: "Patient bypasses 45+ minute registration desk queues and heads directly to their designated OPD room.",
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-12 text-center">
      <div className="mb-10">
        <span className="text-xs font-black uppercase text-red-600 tracking-widest border border-red-600 px-3 py-1 rounded-full bg-red-50 inline-block mb-2">
          Seamless Hospital Workflow
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
          How DocQueue AI OPD Intake Works
        </h2>
        <p className="text-sm sm:text-base text-neutral-600 font-medium max-w-xl mx-auto mt-2">
          Transforming long registration queues into a 5-second voice touchpoint.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => soundSynth.playClick()}
              className="bg-white sketch-border p-6 rounded-2xl text-left relative flex flex-col justify-between sketch-shadow-hover cursor-pointer group"
            >
              {/* Step Number Tag */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 border-2 border-red-600 flex items-center justify-center text-red-600 font-black text-lg">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-neutral-300 group-hover:text-red-600 transition-colors font-mono">
                  {step.number}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Dashed connector line between cards on desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-red-600 bg-white rounded-full p-0.5 border border-red-600" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
