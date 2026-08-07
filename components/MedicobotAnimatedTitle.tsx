'use client'

import { useState, useRef } from 'react'

export default function MedicobotAnimatedTitle() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playVoice = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current
      .play()
      .then(() => setIsSpeaking(true))
      .catch((err) => console.error("Voice Play Error:", err))
  }

  return (
    <div className="relative flex flex-col items-center justify-center my-6 z-20">
      {/* Audio Element linked to the kid's voice file */}
      <audio
        ref={audioRef}
        src="/audio/landing-voice.mp3"
        preload="auto"
        onEnded={() => setIsSpeaking(false)}
      />

      {/* Interactive Title with Bouncing/Pulse Animation on Voice Play */}
      <div
        onClick={playVoice}
        className={`cursor-pointer select-none transition-transform duration-300 transform hover:scale-105 active:scale-95 ${
          isSpeaking ? 'animate-bounce' : ''
        }`}
        title="Click to hear MEDICOBOT!"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-indigo-500 to-pink-500 drop-shadow-md">
          MEDICOBOT
        </h1>
      </div>

      <p className="text-xs text-gray-500 mt-2 font-medium">
        (Tap the title to hear Medicobot! 🔊)
      </p>
    </div>
  )
}
