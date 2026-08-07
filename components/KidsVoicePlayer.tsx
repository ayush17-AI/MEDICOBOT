'use client'

import { useState, useRef } from 'react'

export default function KidsVoicePlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio Playback Error:", err)
        })
    }
  }

  return (
    <div className="my-4 flex justify-center z-20 relative">
      <audio
        ref={audioRef}
        src="/audio/landing-voice.mp3"
        preload="auto"
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={toggleAudio}
        className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-xl transition transform active:scale-95 text-base cursor-pointer"
      >
        <span className="text-xl">{isPlaying ? '⏸' : '🔊'}</span>
        <span>{isPlaying ? 'Pause Voice' : 'Play Voice Guide'}</span>
      </button>
    </div>
  )
}
