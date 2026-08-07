'use client'

import { motion, type Variants } from 'framer-motion'

const TITLE_LETTERS = ["M", "E", "D", "I", "C", "O", "B", "O", "T"]

const LETTER_COLORS = [
  "from-teal-400 to-emerald-500",
  "from-emerald-400 to-teal-600",
  "from-teal-500 to-cyan-500",
  "from-cyan-400 to-blue-500",
  "from-blue-400 to-indigo-500",
  "from-indigo-400 to-purple-500",
  "from-purple-400 to-pink-500",
  "from-pink-400 to-rose-500",
  "from-rose-400 to-teal-500",
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

const letterVariants: Variants = {
  hidden: { y: -30, opacity: 0, scale: 0.6 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    },
  },
}

export default function MedicobotAnimatedTitle({ onLetterBStart }: { onLetterBStart?: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center my-6 z-20">
      <div className="relative select-none px-6 py-3 rounded-3xl bg-white/40 backdrop-blur-sm border border-slate-100 transition-all duration-300">
        <motion.h1
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative text-4xl sm:text-6xl md:text-7xl font-black tracking-wider flex items-center justify-center gap-0.5 sm:gap-1 drop-shadow-md"
        >
          {TITLE_LETTERS.map((letter, index) => {
            const isLetterB = index === 6; // 'B' in M-E-D-I-C-O-B-O-T
            return (
              <motion.span
                key={index}
                variants={letterVariants}
                style={{ animationDelay: `${index * 0.12}s` }}
                onAnimationStart={() => {
                  if (isLetterB) {
                    onLetterBStart?.();
                  }
                }}
                className={`inline-block animate-letter bg-gradient-to-b ${LETTER_COLORS[index]} bg-clip-text text-transparent transform-gpu`}
              >
                {letter}
              </motion.span>
            );
          })}
        </motion.h1>
      </div>
    </div>
  )
}
