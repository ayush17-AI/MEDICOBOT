"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface PopUpHospitalSketchProps {
  animationKey: number; // Increment to re-trigger pop-up and path-draw animations
}

// Framer Motion path variants for self-drawing sketch pen reveal
const pathVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (customDelay: number = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1.4,
        ease: "easeInOut",
        delay: customDelay,
      },
      opacity: { duration: 0.2, delay: customDelay },
    },
  }),
};

export const PopUpHospitalSketch: React.FC<PopUpHospitalSketchProps> = ({
  animationKey,
}) => {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 select-none">
      {/* Perspective Container for 2D Storybook Pop-Up Movement */}
      <div
        className="w-full flex justify-center items-end relative min-h-[380px] sm:min-h-[460px] md:min-h-[500px]"
        style={{
          perspective: "1200px",
          perspectiveOrigin: "50% 100%",
        }}
      >
        {/* STAND-UP POP-UP WRAPPER (rotateX: -90 -> 0 with Spring Physics) */}
        <motion.div
          key={animationKey}
          className="w-full relative origin-bottom flex flex-col items-center justify-end"
          initial={{ rotateX: -90, scaleY: 0, opacity: 0 }}
          animate={{ rotateX: 0, scaleY: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 80,
            damping: 12,
            mass: 1.1,
          }}
        >
          {/* MAIN BLACK INK SKETCH SVG (ZERO SOLID FILLS, ALL STROKE ONLY) */}
          <svg
            className="w-full h-auto max-h-[460px] text-black drop-shadow-sm overflow-visible"
            viewBox="0 0 1000 500"
            fill="none"
            stroke="#000000"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* ------------------------------------------------------------- */}
            {/* 1. TOP BACKGROUND MEDICAL DOODLES (ECG WAVE, SYRINGE, STETHOSCOPE) */}
            {/* ------------------------------------------------------------- */}

            {/* ECG Pulse Rate Heartbeat Line across the top */}
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.1}
              d="M 50 80 L 220 80 L 240 80 L 250 50 L 265 120 L 285 20 L 305 100 L 320 70 L 335 80 L 950 80"
              strokeDasharray="4 4"
            />
            {/* Heart symbol on ECG Pulse */}
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.2}
              d="M 285 20 C 275 10 260 15 265 28 L 285 42 L 305 28 C 310 15 295 10 285 20 Z"
              strokeWidth="2.5"
            />

            {/* 💉 Injection / Syringe (Upper Left Doodle) */}
            <g transform="translate(60, 90) rotate(-25)">
              {/* Barrel */}
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.2}
                x="30"
                y="15"
                width="60"
                height="22"
                rx="2"
              />
              {/* Plunger */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                d="M 90 26 L 120 26 M 120 16 L 120 36 M 105 18 L 105 34"
              />
              {/* Needle Tip & Drops */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                d="M 30 26 L 5 26 M 15 21 L 15 31"
              />
              {/* Fluid Markings */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.4}
                d="M 45 15 L 45 22 M 55 15 L 55 24 M 65 15 L 65 22 M 75 15 L 75 24"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                cx="-2"
                cy="26"
                r="1.5"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                cx="-8"
                cy="29"
                r="1"
              />
            </g>

            {/* 🧪 Medicine Bottle & Pills (Left Ground Side Doodle) */}
            <g transform="translate(100, 310)">
              {/* Syrup Bottle Body */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                d="M 35 30 L 20 30 C 15 30 10 35 10 42 L 10 120 C 10 125 15 130 20 130 L 60 130 C 65 130 70 125 70 120 L 70 42 C 70 35 65 30 60 30 L 45 30 L 45 18 L 35 18 Z"
              />
              {/* Bottle Cap */}
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.4}
                x="32"
                y="8"
                width="16"
                height="10"
                rx="1"
              />
              {/* Bottle Label */}
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.4}
                x="20"
                y="55"
                width="40"
                height="50"
                rx="2"
              />
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                d="M 30 80 L 50 80 M 40 70 L 40 90 M 26 95 L 54 95"
              />

              {/* Capsule Pill 1 */}
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                x="85"
                y="90"
                width="18"
                height="38"
                rx="9"
                transform="rotate(45, 85, 90)"
              />
              <motion.line
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                x1="80"
                y1="102"
                x2="94"
                y2="116"
              />

              {/* Round Pill 2 */}
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                cx="80"
                cy="122"
                r="8"
              />
              <motion.line
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                x1="74"
                y1="122"
                x2="86"
                y2="122"
              />
            </g>

            {/* 🩺 Stethoscope (Right Doodle wrapping around canvas) */}
            <g transform="translate(770, 110)">
              {/* Earpieces & Headband */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                d="M 30 10 C 30 30 50 45 75 45 C 100 45 120 30 120 10"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                cx="30"
                cy="8"
                r="3"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                cx="120"
                cy="8"
                r="3"
              />
              {/* Tubing */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.4}
                d="M 75 45 L 75 90 C 75 140 140 140 140 190 C 140 230 90 250 60 250"
              />
              {/* Chestpiece / Bell */}
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                cx="50"
                cy="250"
                r="16"
                strokeWidth="2.5"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                cx="50"
                cy="250"
                r="7"
              />
            </g>

            {/* 📋 Prescription Clipboard (Upper Right Doodle) */}
            <g transform="translate(730, 20) rotate(10)">
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.3}
                x="10"
                y="10"
                width="45"
                height="65"
                rx="3"
              />
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.4}
                x="22"
                y="6"
                width="21"
                height="10"
                rx="2"
              />
              {/* RX symbol */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                d="M 20 28 L 20 45 M 20 28 Q 30 28 30 35 Q 30 40 20 40 M 25 38 L 34 47"
              />
              <motion.line
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                x1="20"
                y1="54"
                x2="45"
                y2="54"
                strokeDasharray="2 2"
              />
              <motion.line
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                x1="20"
                y1="62"
                x2="40"
                y2="62"
                strokeDasharray="2 2"
              />
            </g>

            {/* 🩹 Band-Aid Doodle (Left Sky) */}
            <g transform="translate(160, 180) rotate(-15)">
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.4}
                x="10"
                y="10"
                width="60"
                height="22"
                rx="11"
              />
              <motion.line
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                x1="30"
                y1="10"
                x2="30"
                y2="32"
              />
              <motion.line
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                x1="50"
                y1="10"
                x2="50"
                y2="32"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                cx="37"
                cy="21"
                r="1"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                cx="43"
                cy="21"
                r="1"
              />
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 2. REALISTIC 2D HAND-DRAWN HOSPITAL BUILDING (CENTER STAGE) */}
            {/* ------------------------------------------------------------- */}

            {/* Central Tower Outer Frame */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.2}
              x="360"
              y="120"
              width="280"
              height="320"
              rx="4"
              strokeWidth="2.5"
            />

            {/* Roof Clock / Radar Header */}
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.3}
              d="M 430 120 L 430 70 L 570 70 L 570 120"
              strokeWidth="2.2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.3}
              x1="410"
              y1="120"
              x2="590"
              y2="120"
              strokeWidth="3"
            />

            {/* Rooftop Medical Cross (Large Emblem) */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x="480"
              y="78"
              width="40"
              height="32"
              rx="2"
              strokeWidth="2.2"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              d="M 490 94 L 510 94 M 500 84 L 500 104"
              strokeWidth="3"
            />

            {/* Roof Antenna Signal Lines */}
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x1="500"
              y1="70"
              x2="500"
              y2="40"
              strokeWidth="2"
            />
            <motion.circle
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              cx="500"
              cy="38"
              r="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              d="M 490 32 Q 500 24 510 32"
              strokeDasharray="2 3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              d="M 482 26 Q 500 14 518 26"
              strokeDasharray="2 3"
            />

            {/* DOCQUEUE AI Signboard Header */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.3}
              x="385"
              y="140"
              width="230"
              height="40"
              rx="3"
              strokeWidth="2.5"
            />
            <text
              x="500"
              y="166"
              textAnchor="middle"
              fill="#000000"
              stroke="none"
              fontSize="16"
              fontWeight="900"
              fontFamily="var(--font-sans), sans-serif"
              letterSpacing="2"
            >
              DOCQUEUE AI • OPD
            </text>

            {/* Central Tower Windows Grid */}
            {/* Row 1 Windows */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x="395"
              y="198"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              d="M 417.5 198 L 417.5 243 M 395 220.5 L 440 220.5"
            />

            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x="455"
              y="198"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              d="M 477.5 198 L 477.5 243 M 455 220.5 L 500 220.5"
            />

            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x="515"
              y="198"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              d="M 537.5 198 L 537.5 243 M 515 220.5 L 560 220.5"
            />

            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x="575"
              y="198"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              d="M 597.5 198 L 597.5 243 M 575 220.5 L 620 220.5"
            />

            {/* Row 2 Windows */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="395"
              y="258"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              d="M 417.5 258 L 417.5 303 M 395 280.5 L 440 280.5"
            />

            {/* Center Digital AI Kiosk Display Window */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="455"
              y="258"
              width="105"
              height="45"
              rx="3"
              strokeWidth="2.5"
            />
            <text
              x="507"
              y="276"
              textAnchor="middle"
              fill="#000000"
              stroke="none"
              fontSize="10"
              fontWeight="bold"
            >
              AI INTAKE KIOSK
            </text>
            <text
              x="507"
              y="294"
              textAnchor="middle"
              fill="#000000"
              stroke="none"
              fontSize="11"
              fontWeight="900"
            >
              TOKEN #42
            </text>

            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="575"
              y="258"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              d="M 597.5 258 L 597.5 303 M 575 280.5 L 620 280.5"
            />

            {/* Row 3 Windows */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x="395"
              y="318"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              d="M 417.5 318 L 417.5 363 M 395 340.5 L 440 340.5"
            />

            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x="575"
              y="318"
              width="45"
              height="45"
              rx="3"
            />
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              d="M 597.5 318 L 597.5 363 M 575 340.5 L 620 340.5"
            />

            {/* Main Entrance Automatic Glass Doors */}
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              d="M 450 365 L 550 365 L 550 375 L 450 375 Z"
              strokeWidth="2.5"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x1="465"
              y1="375"
              x2="465"
              y2="440"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x1="535"
              y1="375"
              x2="535"
              y2="440"
            />
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x="475"
              y="375"
              width="24"
              height="65"
            />
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x="501"
              y="375"
              width="24"
              height="65"
            />
            {/* Door Handles */}
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.8}
              x1="494"
              y1="400"
              x2="494"
              y2="420"
              strokeWidth="2.5"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.8}
              x1="506"
              y1="400"
              x2="506"
              y2="420"
              strokeWidth="2.5"
            />

            {/* LEFT WING BUILDING (OPD SPECIALTY BLOCK A) */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.3}
              x="220"
              y="200"
              width="140"
              height="240"
              rx="3"
            />
            <text
              x="290"
              y="226"
              textAnchor="middle"
              fill="#000000"
              stroke="none"
              fontSize="12"
              fontWeight="bold"
            >
              OPD BLOCK A
            </text>
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x1="240"
              y1="236"
              x2="340"
              y2="236"
              strokeDasharray="3 3"
            />

            {/* Left Wing Windows */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="240"
              y="250"
              width="38"
              height="38"
              rx="2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x1="259"
              y1="250"
              x2="259"
              y2="288"
            />
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="302"
              y="250"
              width="38"
              height="38"
              rx="2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x1="321"
              y1="250"
              x2="321"
              y2="288"
            />

            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x="240"
              y="305"
              width="38"
              height="38"
              rx="2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x1="259"
              y1="305"
              x2="259"
              y2="343"
            />
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x="302"
              y="305"
              width="38"
              height="38"
              rx="2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.6}
              x1="321"
              y1="305"
              x2="321"
              y2="343"
            />

            {/* Left Wing Pharmacy Entrance */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x="268"
              y="375"
              width="44"
              height="65"
              rx="2"
            />
            <motion.circle
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.8}
              cx="304"
              cy="408"
              r="2.5"
            />
            <text
              x="290"
              y="365"
              textAnchor="middle"
              fill="#000000"
              stroke="none"
              fontSize="9"
              fontWeight="bold"
            >
              PHARMACY
            </text>

            {/* RIGHT WING BUILDING (EMERGENCY BAY) */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.3}
              x="640"
              y="200"
              width="140"
              height="240"
              rx="3"
            />
            <text
              x="710"
              y="226"
              textAnchor="middle"
              fill="#000000"
              stroke="none"
              fontSize="12"
              fontWeight="bold"
            >
              EMERGENCY
            </text>
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.4}
              x1="660"
              y1="236"
              x2="760"
              y2="236"
              strokeDasharray="3 3"
            />

            {/* Right Wing Windows */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="660"
              y="250"
              width="38"
              height="38"
              rx="2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x1="679"
              y1="250"
              x2="679"
              y2="288"
            />
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x="722"
              y="250"
              width="38"
              height="38"
              rx="2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.5}
              x1="741"
              y1="250"
              x2="741"
              y2="288"
            />

            {/* Emergency Shutters */}
            <motion.rect
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x="675"
              y="365"
              width="70"
              height="75"
              rx="2"
              strokeWidth="2.2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x1="675"
              y1="382"
              x2="745"
              y2="382"
              strokeDasharray="2 2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x1="675"
              y1="398"
              x2="745"
              y2="398"
              strokeDasharray="2 2"
            />
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.7}
              x1="675"
              y1="414"
              x2="745"
              y2="414"
              strokeDasharray="2 2"
            />

            {/* 🚑 Ambulance Doodle parked near Emergency (Right Side) */}
            <g transform="translate(755, 385)">
              {/* Ambulance Body */}
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.5}
                x="10"
                y="10"
                width="80"
                height="40"
                rx="4"
              />
              {/* Cabin Front */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                d="M 90 22 L 108 22 L 114 36 L 114 50 L 90 50 Z"
              />
              {/* Windshield */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.6}
                d="M 92 25 L 105 25 L 109 34 L 92 34 Z"
              />
              {/* Wheels */}
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.7}
                cx="35"
                cy="52"
                r="9"
                strokeWidth="2.5"
              />
              <motion.circle
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.7}
                cx="90"
                cy="52"
                r="9"
                strokeWidth="2.5"
              />
              {/* Medical Cross on Ambulance */}
              <motion.path
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.8}
                d="M 40 30 L 56 30 M 48 22 L 48 38"
                strokeWidth="2.5"
              />
              {/* Siren */}
              <motion.rect
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                custom={0.8}
                x="95"
                y="16"
                width="8"
                height="6"
                rx="1"
              />
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 3. HORIZON GROUND LINE (INITIAL STATE ANCHOR) */}
            {/* ------------------------------------------------------------- */}
            <motion.line
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.0}
              x1="0"
              y1="440"
              x2="1000"
              y2="440"
              strokeWidth="3.5"
            />

            {/* Hand-Drawn Ground Hatching Texture */}
            <motion.path
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              custom={0.1}
              d="M 20 448 L 70 448 M 140 452 L 210 452 M 360 448 L 470 448 M 530 452 L 640 452 M 800 448 L 920 448"
              strokeDasharray="4 4"
            />
          </svg>
        </motion.div>

        {/* PERMANENT HORIZON GROUND LINE (Static Base Line) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black z-10" />
      </div>
    </div>
  );
};
