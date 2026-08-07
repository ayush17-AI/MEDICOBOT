'use client'

import { useState, useRef } from 'react'

export default function KidsVoicePlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => console.error("Audio playback error:", err))
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="my-6 flex justify-center relative z-30">
      {/* Exact Path for the attached voice file */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
      >
        <source src="/audio/output (1).bin" type="audio/mp3" />
      </audio>
      <button
        type="button"
        onClick={toggleAudio}
        className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-lg transition transform active:scale-95 text-base cursor-pointer"
      >
        <span className="text-xl">{isPlaying ? '⏸' : '🔊'}</span>
        <span>{isPlaying ? 'Pause Voice' : 'Play Voice Guide'}</span>
      </button>
    </div>
  )
}
