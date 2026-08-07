'use client'

import { useState, useRef } from 'react'

export default function LandingAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="my-4 flex justify-center relative z-20">
      <audio ref={audioRef} src="/audio/landing-voice.wav" onEnded={() => setIsPlaying(false)} />
      <button
        type="button"
        onClick={toggleAudio}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full shadow-lg transition cursor-pointer"
      >
        <span>{isPlaying ? '⏸ Pause Guidance Voice' : '🔊 Play Guidance Voice'}</span>
      </button>
    </div>
  )
}
