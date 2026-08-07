'use client'

import React from 'react'
import { Stethoscope, Syringe, Pill, HeartPulse, Thermometer, Activity } from 'lucide-react'

export default function FloatingMedicalIcons() {
  const items = [
    { icon: Stethoscope, bg: 'bg-purple-100 text-purple-500', pos: 'top-10 left-12', anim: 'animate-float-1', size: 'w-10 h-10' },
    { icon: Syringe, bg: 'bg-blue-100 text-blue-500', pos: 'top-12 right-20', anim: 'animate-float-2', size: 'w-10 h-10' },
    { icon: HeartPulse, bg: 'bg-teal-100 text-teal-500', pos: 'top-1/3 left-8', anim: 'animate-float-3', size: 'w-9 h-9' },
    { icon: Pill, bg: 'bg-indigo-100 text-indigo-500', pos: 'top-20 right-1/3', anim: 'animate-float-4', size: 'w-8 h-8' },
    { icon: Stethoscope, bg: 'bg-pink-100 text-pink-500', pos: 'bottom-24 left-16', anim: 'animate-float-2', size: 'w-10 h-10' },
    { icon: Thermometer, bg: 'bg-sky-100 text-sky-500', pos: 'bottom-12 left-1/3', anim: 'animate-float-1', size: 'w-9 h-9' },
    { icon: Activity, bg: 'bg-emerald-100 text-emerald-500', pos: 'bottom-16 right-12', anim: 'animate-float-3', size: 'w-10 h-10' },
    { icon: Pill, bg: 'bg-rose-100 text-rose-500', pos: 'bottom-1/3 right-10', anim: 'animate-float-4', size: 'w-9 h-9' },
  ]

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Subtle background polka dots pattern */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e0e7ff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <div
            key={idx}
            className={`absolute ${item.pos} ${item.anim} flex items-center justify-center p-4 rounded-full ${item.bg} shadow-md backdrop-blur-sm border border-white/50`}
          >
            <Icon className={item.size}/>
          </div>
        )
      })}
    </div>
  )
}
