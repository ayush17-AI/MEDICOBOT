"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { soundSynth } from "@/utils/soundEffects";

interface PopUpHospitalSceneryProps {
  onBuildingClick?: () => void;
}

export const PopUpHospitalScenery: React.FC<PopUpHospitalSceneryProps> = ({
  onBuildingClick,
}) => {
  const [sirenActive, setSirenActive] = useState(false);
  const [swayTrees, setSwayTrees] = useState(false);

  const handleAmbulanceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundSynth.playClick();
    setSirenActive(true);
    setTimeout(() => setSirenActive(false), 2000);
  };

  const handleTreeHover = () => {
    setSwayTrees(true);
    setTimeout(() => setSwayTrees(false), 1500);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 mt-8 pt-6 select-none overflow-hidden">
      {/* Perspective Container for 3D Pop-Up Book Stand-up Effect */}
      <div
        className="w-full flex justify-center items-end"
        style={{
          perspective: "1200px",
          perspectiveOrigin: "50% 100%",
        }}
      >
        <motion.div
          className="w-full relative origin-bottom cursor-pointer"
          initial={{ rotateX: 90, scaleY: 0, opacity: 0 }}
          animate={{ rotateX: 0, scaleY: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 65,
            damping: 12,
            mass: 1.2,
            delay: 0.15,
          }}
          onClick={onBuildingClick}
        >
          {/* Floating Clouds in Background (Red Line-Art) */}
          <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none overflow-hidden">
            <motion.svg
              className="absolute top-2 left-[10%] w-24 h-12 text-red-600 opacity-60"
              animate={{ x: [0, 25, 0] }}
              transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
              viewBox="0 0 100 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M 10 35 Q 20 15 40 20 Q 55 5 70 20 Q 90 20 85 35 Z" />
            </motion.svg>

            <motion.svg
              className="absolute top-6 right-[15%] w-32 h-14 text-red-600 opacity-70"
              animate={{ x: [0, -30, 0] }}
              transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
              viewBox="0 0 120 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M 15 45 Q 25 20 50 25 Q 70 10 90 25 Q 110 30 105 45 Z" />
            </motion.svg>

            {/* Sun / Cross Pulse Heart */}
            <motion.svg
              className="absolute top-1 right-[5%] w-14 h-14 text-red-600"
              animate={{ scale: [1, 1.08, 1], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              viewBox="0 0 60 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="30" cy="30" r="16" strokeDasharray="3 3" />
              {/* Sun rays line art */}
              <line x1="30" y1="4" x2="30" y2="10" />
              <line x1="30" y1="50" x2="30" y2="56" />
              <line x1="4" y1="30" x2="10" y2="30" />
              <line x1="50" y1="30" x2="56" y2="30" />
              <line x1="12" y1="12" x2="16" y2="16" />
              <line x1="44" y1="44" x2="48" y2="48" />
              <line x1="12" y1="48" x2="16" y2="44" />
              <line x1="44" y1="16" x2="48" y2="12" />
              {/* Medical Heart inside sun */}
              <path d="M 30 25 C 27 20 22 23 25 28 L 30 33 L 35 28 C 38 23 33 20 30 25 Z" />
            </motion.svg>
          </div>

          {/* MAIN RED LINE-ART SVG OF HOSPITAL & SCENERY */}
          <svg
            className="w-full h-auto max-h-[420px] text-red-600 drop-shadow-sm"
            viewBox="0 0 1200 480"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* BACKGROUND DECORATIVE LINES & TREES */}
            {/* Left Trees */}
            <g
              onMouseEnter={handleTreeHover}
              className={`transition-transform duration-500 origin-bottom ${
                swayTrees ? "rotate-2" : ""
              }`}
            >
              {/* Left Pine Tree 1 */}
              <path d="M 60 440 L 60 360" />
              <path d="M 60 360 L 30 400 L 45 400 L 20 425 L 100 425 L 75 400 L 90 400 Z" />
              {/* Left Round Tree 2 */}
              <path d="M 120 440 L 120 330" />
              <path d="M 120 330 C 90 330 80 290 105 270 C 95 240 135 230 150 250 C 170 230 200 260 185 285 C 200 310 170 340 120 330 Z" />
              {/* Tree sketch hatch lines */}
              <path d="M 115 280 Q 125 290 135 280" strokeDasharray="2 4" />
              <path d="M 130 300 Q 140 310 150 300" strokeDasharray="2 4" />
            </g>

            {/* Right Trees */}
            <g
              onMouseEnter={handleTreeHover}
              className={`transition-transform duration-500 origin-bottom ${
                swayTrees ? "-rotate-2" : ""
              }`}
            >
              {/* Right Tree 1 */}
              <path d="M 1080 440 L 1080 340" />
              <path d="M 1080 340 C 1050 340 1040 300 1065 280 C 1055 250 1095 240 1110 260 C 1130 240 1160 270 1145 295 C 1160 320 1130 350 1080 340 Z" />
              {/* Right Pine Tree 2 */}
              <path d="M 1150 440 L 1150 370" />
              <path d="M 1150 370 L 1125 405 L 1138 405 L 1115 430 L 1185 430 L 1162 405 L 1175 405 Z" />
            </g>

            {/* Street Lamps */}
            {/* Left Lamp */}
            <path d="M 210 440 L 210 370 C 210 355 225 355 225 362" />
            <circle cx="225" cy="365" r="4" strokeDasharray="2 2" />
            {/* Right Lamp */}
            <path d="M 990 440 L 990 370 C 990 355 975 355 975 362" />
            <circle cx="975" cy="365" r="4" strokeDasharray="2 2" />

            {/* Hospital Bench */}
            <path d="M 235 440 L 235 415 L 285 415 L 285 440" />
            <path d="M 230 422 L 290 422" />
            <path d="M 230 415 L 230 400 L 290 400 L 290 415" />

            {/* ------------------------------------------------------------- */}
            {/* HOSPITAL MAIN BUILDING ARCHITECTURE (RED LINE-ART SKETCH) */}
            {/* ------------------------------------------------------------- */}

            {/* Building Shadow / Base Outline */}
            <path d="M 280 440 L 920 440" strokeWidth="3" />

            {/* Main Central Tower Outer Frame */}
            <rect x="440" y="100" width="320" height="340" rx="4" />

            {/* Roof Clock / Radar Tower Header */}
            <path d="M 520 100 L 520 50 L 680 50 L 680 100" />
            <path d="M 500 100 L 700 100" strokeWidth="3" />

            {/* Rooftop Medical Cross (Large Emblem) */}
            <rect x="580" y="60" width="40" height="30" rx="2" />
            {/* Cross Emblem */}
            <path d="M 593 75 L 607 75" strokeWidth="3" />
            <path d="M 600 68 L 600 82" strokeWidth="3" />

            {/* Antenna / Radar Signals on Roof */}
            <path d="M 600 50 L 600 20" />
            <circle cx="600" cy="20" r="3" />
            <path d="M 590 15 Q 600 5 610 15" strokeDasharray="2 3" />
            <path d="M 582 10 Q 600 -3 618 10" strokeDasharray="2 3" />

            {/* DOCQUEUE AI - OPD INTAKE Banner Signboard on Building Front */}
            <rect x="465" y="125" width="270" height="40" rx="3" strokeWidth="2.5" />
            <text
              x="600"
              y="150"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="18"
              fontWeight="bold"
              fontFamily="var(--font-sans), sans-serif"
              letterSpacing="2"
            >
              DOCQUEUE AI • OPD
            </text>
            <path d="M 475 160 L 725 160" strokeDasharray="4 4" />

            {/* Central Tower Windows Grid (3 Rows x 4 Cols) */}
            {/* Row 1 */}
            <rect x="475" y="185" width="45" height="45" rx="3" />
            <path d="M 497.5 185 L 497.5 230" />
            <path d="M 475 207.5 L 520 207.5" />

            <rect x="542" y="185" width="45" height="45" rx="3" />
            <path d="M 564.5 185 L 564.5 230" />
            <path d="M 542 207.5 L 587 207.5" />

            <rect x="612" y="185" width="45" height="45" rx="3" />
            <path d="M 634.5 185 L 634.5 230" />
            <path d="M 612 207.5 L 657 207.5" />

            <rect x="680" y="185" width="45" height="45" rx="3" />
            <path d="M 702.5 185 L 702.5 230" />
            <path d="M 680 207.5 L 725 207.5" />

            {/* Row 2 */}
            <rect x="475" y="250" width="45" height="45" rx="3" />
            <path d="M 497.5 250 L 497.5 295" />
            <path d="M 475 272.5 L 520 272.5" />

            {/* Central OPD AI Screen Window */}
            <rect x="542" y="250" width="115" height="45" rx="3" strokeWidth="2.5" />
            <path d="M 552 272.5 L 647 272.5" strokeDasharray="3 3" />
            <text
              x="600"
              y="268"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="10"
              fontWeight="bold"
            >
              AI TRIAGE KIOSK
            </text>
            <text
              x="600"
              y="288"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="11"
              fontWeight="bold"
            >
              SERVING #42
            </text>

            <rect x="680" y="250" width="45" height="45" rx="3" />
            <path d="M 702.5 250 L 702.5 295" />
            <path d="M 680 272.5 L 725 272.5" />

            {/* Row 3 */}
            <rect x="475" y="315" width="45" height="45" rx="3" />
            <path d="M 497.5 315 L 497.5 360" />
            <path d="M 475 337.5 L 520 337.5" />

            <rect x="680" y="315" width="45" height="45" rx="3" />
            <path d="M 702.5 315 L 702.5 360" />
            <path d="M 680 337.5 L 725 337.5" />

            {/* Main Entrance Overhang & Automatic Glass Doors */}
            <path d="M 530 365 L 670 365 L 670 375 L 530 375 Z" strokeWidth="2.5" />
            <path d="M 545 375 L 545 440" />
            <path d="M 655 375 L 655 440" />
            {/* Sliding Glass Doors */}
            <rect x="555" y="375" width="42" height="65" />
            <rect x="603" y="375" width="42" height="65" />
            {/* Door Handles */}
            <line x1="590" y1="400" x2="590" y2="420" strokeWidth="2.5" />
            <line x1="610" y1="400" x2="610" y2="420" strokeWidth="2.5" />
            {/* Welcome Mat */}
            <path d="M 540 440 L 660 440" strokeWidth="4" />
            <text
              x="600"
              y="360"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="9"
              fontWeight="bold"
            >
              MAIN INTAKE ENTRANCE
            </text>

            {/* ------------------------------------------------------------- */}
            {/* LEFT WING BUILDING (OPD SPECIALTY BLOCK) */}
            {/* ------------------------------------------------------------- */}
            <rect x="290" y="190" width="150" height="250" rx="3" />
            <path d="M 290 190 L 440 190" strokeWidth="3" />
            <text
              x="365"
              y="215"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="12"
              fontWeight="bold"
            >
              OPD BLOCK A
            </text>
            <line x1="310" y1="225" x2="420" y2="225" strokeDasharray="3 3" />

            {/* Left Wing Windows */}
            <rect x="310" y="240" width="40" height="40" rx="2" />
            <line x1="330" y1="240" x2="330" y2="280" />
            <rect x="380" y="240" width="40" height="40" rx="2" />
            <line x1="400" y1="240" x2="400" y2="280" />

            <rect x="310" y="300" width="40" height="40" rx="2" />
            <line x1="330" y1="300" x2="330" y2="340" />
            <rect x="380" y="300" width="40" height="40" rx="2" />
            <line x1="400" y1="300" x2="400" y2="340" />

            {/* Left Wing Pharmacy Door */}
            <rect x="345" y="375" width="50" height="65" rx="2" />
            <circle cx="385" cy="410" r="2.5" />
            <text
              x="370"
              y="365"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="9"
              fontWeight="bold"
            >
              PHARMACY
            </text>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT WING BUILDING (EMERGENCY & TRAUMA BAY) */}
            {/* ------------------------------------------------------------- */}
            <rect x="760" y="190" width="160" height="250" rx="3" />
            <path d="M 760 190 L 920 190" strokeWidth="3" />
            <text
              x="840"
              y="215"
              textAnchor="middle"
              fill="#DC2626"
              stroke="none"
              fontSize="12"
              fontWeight="bold"
            >
              EMERGENCY + TRIAGE
            </text>
            <line x1="780" y1="225" x2="900" y2="225" strokeDasharray="3 3" />

            {/* Right Wing Windows */}
            <rect x="780" y="240" width="40" height="40" rx="2" />
            <line x1="800" y1="240" x2="800" y2="280" />
            <rect x="860" y="240" width="40" height="40" rx="2" />
            <line x1="880" y1="240" x2="880" y2="280" />

            <rect x="780" y="300" width="40" height="40" rx="2" />
            <line x1="800" y1="300" x2="800" y2="340" />
            <rect x="860" y="300" width="40" height="40" rx="2" />
            <line x1="880" y1="300" x2="880" y2="340" />

            {/* Emergency Shutters Door */}
            <rect x="800" y="365" width="80" height="75" rx="2" strokeWidth="2.5" />
            <line x1="800" y1="380" x2="880" y2="380" strokeDasharray="2 2" />
            <line x1="800" y1="395" x2="880" y2="395" strokeDasharray="2 2" />
            <line x1="800" y1="410" x2="880" y2="410" strokeDasharray="2 2" />
            <line x1="800" y1="425" x2="880" y2="425" strokeDasharray="2 2" />

            {/* ------------------------------------------------------------- */}
            {/* AMBULANCE VECTOR (INTERACTIVE RED LINE-ART SKETCH) */}
            {/* ------------------------------------------------------------- */}
            <g
              onClick={handleAmbulanceClick}
              className="cursor-pointer group hover:opacity-95 transition-opacity"
            >
              {/* Ambulance Body */}
              <rect x="890" y="390" width="85" height="45" rx="5" strokeWidth="2.2" />
              {/* Cabin Front */}
              <path d="M 975 405 L 995 405 L 1000 420 L 1000 435 L 975 435 Z" strokeWidth="2.2" />
              {/* Windshield */}
              <path d="M 977 408 L 992 408 L 996 418 L 977 418 Z" />
              {/* Wheels */}
              <circle cx="920" cy="437" r="10" strokeWidth="2.5" />
              <circle cx="920" cy="437" r="4" />
              <circle cx="975" cy="437" r="10" strokeWidth="2.5" />
              <circle cx="975" cy="437" r="4" />
              {/* Medical Cross on Ambulance */}
              <path d="M 925 412 L 941 412" strokeWidth="2.5" />
              <path d="M 933 404 L 933 420" strokeWidth="2.5" />
              {/* Siren Light on Top */}
              <rect
                x="980"
                y="398"
                width="8"
                height="7"
                rx="1"
                className={sirenActive ? "animate-pulse fill-red-600" : ""}
              />
              {/* Siren Waves when clicked */}
              {sirenActive && (
                <>
                  <path d="M 978 393 Q 984 388 990 393" strokeDasharray="2 2" />
                  <path d="M 973 388 Q 984 380 995 388" strokeDasharray="2 2" />
                </>
              )}
            </g>

            {/* GROUND BASELINE & HAND-DRAWN SKETCH GROUND HATCHING */}
            <path d="M 0 440 L 1200 440" strokeWidth="3" />
            {/* Sketch ground lines */}
            <path d="M 20 448 L 70 448" strokeDasharray="4 4" />
            <path d="M 150 452 L 230 452" strokeDasharray="6 4" />
            <path d="M 400 448 L 520 448" strokeDasharray="5 5" />
            <path d="M 680 452 L 780 452" strokeDasharray="4 4" />
            <path d="M 950 448 L 1050 448" strokeDasharray="6 4" />
            <path d="M 1100 452 L 1180 452" strokeDasharray="4 4" />

            {/* Grass tufts */}
            <path d="M 170 440 L 173 430 L 177 440" />
            <path d="M 175 440 L 180 427 L 183 440" />
            <path d="M 1030 440 L 1033 430 L 1037 440" />
            <path d="M 1035 440 L 1040 427 L 1043 440" />
          </svg>

          {/* Interactive Tooltip Badge over Hospital */}
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border-2 border-red-600 px-4 py-1.5 rounded-full shadow-[4px_4px_0px_#DC2626] flex items-center space-x-2 text-xs font-bold text-red-600"
            whileHover={{ scale: 1.05 }}
          >
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>Interactive OPD Building Sketch • Pop-Up Book Effect</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Red Ground Baseline accent bar */}
      <div className="w-full h-1.5 bg-red-600 mt-0.5 rounded-full" />
      <div className="w-full h-0.5 border-b-2 border-dashed border-red-600 mt-1 opacity-60" />
    </div>
  );
};
