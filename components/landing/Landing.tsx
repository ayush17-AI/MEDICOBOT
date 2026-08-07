"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants, type Easing } from "framer-motion";

/* -------------------------------------------------------------------------
 * Phase 1 — Brand landing & interactive logo animation engine.
 * Same engine built earlier for the standalone MEDICOBOT page, wired up
 * here with an onDone callback so the kiosk flow can advance to Phase 2
 * after the 1.2s pause + blur-dissolve transition.
 * ---------------------------------------------------------------------- */

const EASE_LAND: Easing = [0.16, 1, 0.3, 1];

const LETTERS: {
  id: string;
  char: string;
  outline: string;
  fillLight: string;
  pattern: "stripes" | "dots" | "capsule" | "zigzag" | "web" | "plus";
}[] = [
  { id: "M", char: "M", outline: "#059669", fillLight: "#EAFBF3", pattern: "stripes" },
  { id: "E", char: "E", outline: "#D97706", fillLight: "#FEF3E1", pattern: "dots" },
  { id: "D", char: "D", outline: "#CA8A04", fillLight: "#FEFAE0", pattern: "dots" },
  { id: "I", char: "I", outline: "#BE185D", fillLight: "#FDF1F6", pattern: "capsule" },
  { id: "C", char: "C", outline: "#DC2626", fillLight: "#FDEDEB", pattern: "zigzag" },
  { id: "O1", char: "O", outline: "#7C3AED", fillLight: "#F5EBF9", pattern: "web" },
  { id: "B", char: "B", outline: "#0284C7", fillLight: "#EAF4FC", pattern: "plus" },
  { id: "O2", char: "O", outline: "#78350F", fillLight: "#F0E9E7", pattern: "plus" },
  { id: "T", char: "T", outline: "#15803D", fillLight: "#E8F6EE", pattern: "plus" },
];

function PatternDefs() {
  return (
    <defs>
      {LETTERS.map((l) => {
        const pid = `pat-${l.id}`;
        switch (l.pattern) {
          case "stripes":
            return (
              <pattern key={pid} id={pid} width="7" height="7" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill={l.fillLight} />
                <rect x="1" width="2" height="7" fill={l.outline} opacity={0.85} />
              </pattern>
            );
          case "dots":
            return (
              <pattern key={pid} id={pid} width="9" height="9" patternUnits="userSpaceOnUse">
                <rect width="9" height="9" fill={l.fillLight} />
                <circle cx="4.5" cy="4.5" r="1.8" fill={l.outline} opacity={0.85} />
              </pattern>
            );
          case "zigzag":
            return (
              <pattern key={pid} id={pid} width="16" height="10" patternUnits="userSpaceOnUse">
                <rect width="16" height="10" fill={l.fillLight} />
                <polyline points="0,8 4,2 8,8 12,2 16,8" fill="none" stroke={l.outline} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
              </pattern>
            );
          case "web":
            return (
              <pattern key={pid} id={pid} width="14" height="14" patternUnits="userSpaceOnUse">
                <rect width="14" height="14" fill={l.fillLight} />
                <path d="M0,0 L14,14 M14,0 L0,14 M7,0 L7,14 M0,7 L14,7" stroke={l.outline} strokeWidth="0.9" opacity={0.55} />
                <circle cx="7" cy="7" r="3" fill="none" stroke={l.outline} strokeWidth="0.9" opacity={0.55} />
              </pattern>
            );
          case "plus":
            return (
              <pattern key={pid} id={pid} width="12" height="12" patternUnits="userSpaceOnUse">
                <rect width="12" height="12" fill={l.fillLight} />
                <path d="M6,2 V10 M2,6 H10" stroke={l.outline} strokeWidth="2" strokeLinecap="round" opacity={0.85} />
              </pattern>
            );
          default:
            return null;
        }
      })}
    </defs>
  );
}

/** Double-stroke cartoon border: thick white inner stroke + dark drop-shadow. */
const cartoonFilter = "drop-shadow(4px 4px 0px #2E1065)";

function Glyph({ letter, size }: { letter: (typeof LETTERS)[number]; size: number }) {
  if (letter.pattern === "capsule") {
    return (
      <svg width={size * 0.6} height={size} viewBox="0 0 60 120" aria-label="I" style={{ filter: cartoonFilter }}>
        <rect x="6" y="4" width="48" height="52" rx="26" fill={letter.fillLight} stroke="#FFFFFF" strokeWidth="8" />
        <rect x="6" y="4" width="48" height="52" rx="26" fill="none" stroke={letter.outline} strokeWidth="3" />
        <rect x="6" y="64" width="48" height="52" rx="26" fill={letter.outline} stroke="#FFFFFF" strokeWidth="8" />
        <line x1="6" y1="60" x2="54" y2="60" stroke="#00000022" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 140" aria-label={letter.char} style={{ filter: cartoonFilter }}>
      <text
        x="60" y="112" textAnchor="middle" fontSize="132" fontWeight={900}
        style={{ fontFamily: "'Baloo 2','Fredoka',ui-rounded,system-ui,sans-serif" }}
        fill={`url(#pat-${letter.id})`} stroke="#FFFFFF" strokeWidth="8" paintOrder="stroke fill"
      >
        {letter.char}
      </text>
      <text
        x="60" y="112" textAnchor="middle" fontSize="132" fontWeight={900}
        style={{ fontFamily: "'Baloo 2','Fredoka',ui-rounded,system-ui,sans-serif" }}
        fill="none" stroke={letter.outline} strokeWidth="2.5"
      >
        {letter.char}
      </text>
    </svg>
  );
}

/* --------------------------- Trajectory timing ---------------------------- */

const T_MD_LAND = 1.0;
const T_E_START = T_MD_LAND + 0.05;
const T_E_LAND = T_E_START + 0.5;
const T_I_START = T_E_LAND + 0.05;
const T_I_LAND = T_I_START + 0.9;
const T_C_START = T_I_LAND + 0.05;
const T_C_LAND = T_C_START + 0.6;
const T_O1_START = T_C_LAND + 0.05;
const T_O1_LAND = T_O1_START + 1.2; // tyre-roll needs a touch more runway
const T_BOT_START = T_O1_LAND + 0.1;
const T_BOT_LAND = T_BOT_START + 1.3;
export const TITLE_DONE = T_BOT_LAND + 0.2;

function crashDrop(reduced: boolean): Variants {
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } };
  return {
    hidden: { y: -600, opacity: 1 },
    show: {
      y: [-600, 18, -22, 6, 0],
      transition: { duration: T_MD_LAND, times: [0, 0.55, 0.72, 0.88, 1], ease: ["easeIn", "easeOut", "easeInOut", "easeOut"] },
    },
  };
}
function squeezePop(reduced: boolean): Variants {
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: T_E_START } } };
  return {
    hidden: { scale: 0, opacity: 0 },
    show: { scale: [0, 1.2, 1], opacity: 1, transition: { duration: T_E_LAND - T_E_START, delay: T_E_START, times: [0, 0.65, 1], ease: ["easeOut", "easeInOut"] } },
  };
}
function rocketLaunch(reduced: boolean): Variants {
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: T_I_START } } };
  return {
    hidden: { y: 600, opacity: 1 },
    show: { y: [600, -70, 0], transition: { duration: T_I_LAND - T_I_START, delay: T_I_START, times: [0, 0.6, 1], ease: ["easeOut", "easeInOut"] } },
  };
}
function rightSlide(reduced: boolean): Variants {
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: T_C_START } } };
  return {
    hidden: { x: 700, opacity: 1 },
    show: { x: [700, -14, 0], transition: { duration: T_C_LAND - T_C_START, delay: T_C_START, times: [0, 0.75, 1], ease: ["easeOut", "easeOut"] } },
  };
}
/** "Tyre-on-road": rolls in from the left, bounces up onto M's crown, then
 * rolls across the tops of M→E→D→I→C (rotate -720→0) before dropping into
 * its slot beside C. */
function tyreRoll(reduced: boolean): Variants {
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: T_O1_START } } };
  return {
    hidden: { x: -900, y: 0, rotate: 0, opacity: 1 },
    show: {
      x: [-900, -520, -520, -140, 0],
      y: [0, 0, -90, -90, 0],
      rotate: [0, -180, -360, -600, -720],
      transition: {
        duration: T_O1_LAND - T_O1_START,
        delay: T_O1_START,
        times: [0, 0.25, 0.35, 0.75, 1],
        ease: ["easeIn", "easeOut", "linear", "easeIn"],
      },
    },
  };
}
function parachuteDrop(reduced: boolean, extraDelay: number): Variants {
  const start = T_BOT_START + extraDelay;
  const dur = T_BOT_LAND - T_BOT_START;
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: start } } };
  return {
    hidden: { y: -380, rotate: 0, opacity: 1 },
    show: { y: [-380, -40, 0], rotate: [-10, 10, -5, 0], transition: { duration: dur, delay: start, times: [0, 0.7, 0.9, 1], ease: "easeInOut" } },
  };
}
function parachuteCanopy(reduced: boolean, extraDelay: number): Variants {
  const start = T_BOT_START + extraDelay;
  const dur = T_BOT_LAND - T_BOT_START;
  if (reduced) return { hidden: { opacity: 0 }, show: { opacity: 0 } };
  return {
    hidden: { opacity: 1, scale: 1, y: -40 },
    show: { opacity: [1, 1, 0], scale: [1, 1, 0.4], y: [-40, -30, -10], transition: { duration: dur, delay: start, times: [0, 0.75, 1], ease: "easeInOut" } },
  };
}

function Parachute({ color }: { color: string }) {
  return (
    <svg width="70" height="60" viewBox="0 0 70 60" style={{ position: "absolute", top: -54, left: "50%", transform: "translateX(-50%)" }}>
      <path d="M4,28 Q35,-6 66,28 Z" fill={color} opacity={0.85} />
      <path d="M4,28 Q35,14 66,28" fill="none" stroke="#000" strokeWidth="1" opacity={0.3} />
      <line x1="10" y1="28" x2="30" y2="52" stroke="#000" strokeWidth="1.2" opacity={0.5} />
      <line x1="60" y1="28" x2="40" y2="52" stroke="#000" strokeWidth="1.2" opacity={0.5} />
      <line x1="35" y1="20" x2="35" y2="52" stroke="#000" strokeWidth="1.2" opacity={0.5} />
    </svg>
  );
}

function MedicoTitle() {
  const reduced = !!useReducedMotion();
  const size = 78;

  const rigs: Record<string, Variants> = {
    M: crashDrop(reduced),
    D: crashDrop(reduced),
    E: squeezePop(reduced),
    I: rocketLaunch(reduced),
    C: rightSlide(reduced),
    O1: tyreRoll(reduced),
    B: parachuteDrop(reduced, 0),
    O2: parachuteDrop(reduced, 0.15),
    T: parachuteDrop(reduced, 0.3),
  };
  const parachuteRigs: Record<string, Variants> = {
    B: parachuteCanopy(reduced, 0),
    O2: parachuteCanopy(reduced, 0.15),
    T: parachuteCanopy(reduced, 0.3),
  };

  return (
    <div className="relative flex items-end justify-center gap-1 sm:gap-2 md:gap-3 overflow-visible px-2" style={{ perspective: 1200 }}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <PatternDefs />
      </svg>
      {LETTERS.map((l) => (
        <motion.div key={l.id} className="relative" variants={rigs[l.id]} initial="hidden" animate="show">
          {(l.id === "B" || l.id === "O2" || l.id === "T") && (
            <motion.div variants={parachuteRigs[l.id]} initial="hidden" animate="show">
              <Parachute color={l.outline} />
            </motion.div>
          )}
          <Glyph letter={l} size={size} />
        </motion.div>
      ))}
    </div>
  );
}

/* --------------------------- Hospital scene -------------------------------- */

function StickMount({ children, index, stickHeight, baseDelay }: { children: ReactNode; index: number; stickHeight: number; baseDelay: number }) {
  const reduced = !!useReducedMotion();
  const delay = baseDelay + index * 0.2;
  const variants: Variants = reduced
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5, delay } } }
    : { hidden: { rotateX: -90, opacity: 0, scaleY: 0.2 }, show: { rotateX: 0, opacity: 1, scaleY: 1, transition: { duration: 2.2, delay, ease: EASE_LAND } } };
  return (
    <motion.div className="relative flex flex-col items-center" style={{ transformOrigin: "bottom center", transformStyle: "preserve-3d" }} variants={variants} initial="hidden" animate="show">
      <div className="relative">{children}</div>
      <div className="bg-black" style={{ width: 4, height: stickHeight }} />
    </motion.div>
  );
}

function HospitalBuilding() {
  return (
    <svg width="180" height="200" viewBox="0 0 220 240" className="block">
      <rect x="20" y="60" width="180" height="170" fill="#A3E4D7" />
      <rect x="20" y="30" width="180" height="34" rx="4" fill="#FDF6E3" stroke="#00000010" />
      <rect x="34" y="36" width="8" height="22" fill="#E74C3C" />
      <rect x="26" y="44" width="24" height="8" fill="#E74C3C" />
      <text x="120" y="53" textAnchor="middle" fontSize="20" fontWeight={800} fill="#2C3E50" style={{ fontFamily: "'Baloo 2','Fredoka',ui-rounded,sans-serif" }}>HOSPITAL</text>
      <g>
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 4 }).map((__, c) => (
            <g key={`${r}-${c}`}>
              <rect x={54 + c * 24} y={78 + r * 24} width="20" height="20" fill="#AED6F1" stroke="#7FB3D5" strokeWidth="1" />
              <line x1={54 + c * 24} y1={98 + r * 24} x2={74 + c * 24} y2={78 + r * 24} stroke="#EBF5FB" strokeWidth="2" opacity="0.7" />
            </g>
          ))
        )}
      </g>
      <rect x="70" y="176" width="80" height="10" fill="#C0392B" />
      <polygon points="60,176 160,176 150,164 70,164" fill="#E74C3C" />
      <rect x="76" y="186" width="8" height="44" fill="#2C3E50" />
      <rect x="136" y="186" width="8" height="44" fill="#2C3E50" />
      <rect x="90" y="188" width="40" height="42" fill="#D6EAF8" stroke="#85C1E9" strokeWidth="1.5" />
      <line x1="110" y1="188" x2="110" y2="230" stroke="#85C1E9" strokeWidth="1.5" />
    </svg>
  );
}
function Ambulance() {
  return (
    <svg width="130" height="90" viewBox="0 0 150 100" className="block">
      <rect x="8" y="34" width="100" height="40" rx="6" fill="#FFFFFF" stroke="#B0B0B0" strokeWidth="1.5" />
      <path d="M108,40 h22 l14,20 v14 h-36 z" fill="#FFFFFF" stroke="#B0B0B0" strokeWidth="1.5" />
      <rect x="8" y="50" width="100" height="10" fill="#E74C3C" />
      <rect x="112" y="52" width="26" height="16" fill="#D6EAF8" stroke="#85C1E9" />
      <circle cx="34" cy="78" r="12" fill="#2C3E50" />
      <circle cx="34" cy="78" r="5" fill="#BDC3C7" />
      <circle cx="106" cy="78" r="12" fill="#2C3E50" />
      <circle cx="106" cy="78" r="5" fill="#BDC3C7" />
      <rect x="46" y="14" width="6" height="18" fill="#E74C3C" />
      <rect x="38" y="21" width="22" height="6" fill="#E74C3C" />
    </svg>
  );
}
function Greenery() {
  return (
    <svg width="90" height="80" viewBox="0 0 100 90" className="block">
      <circle cx="30" cy="55" r="26" fill="#58D68D" />
      <circle cx="60" cy="45" r="32" fill="#2ECC71" />
      <circle cx="82" cy="60" r="20" fill="#58D68D" />
      <rect x="55" y="70" width="10" height="18" fill="#7B5232" />
    </svg>
  );
}
function StethoscopeCutout() {
  return (
    <svg width="80" height="100" viewBox="0 0 90 110" className="block">
      <path d="M20,10 v22 a18,18 0 0 0 36,0 V10 M20,10 h-8 M56,10 h8 M38,52 v14 a20,20 0 0 0 40,0 v-8" fill="none" stroke="#3498DB" strokeWidth="6" strokeLinecap="round" />
      <circle cx="78" cy="78" r="10" fill="#2C3E50" />
      <circle cx="78" cy="78" r="4" fill="#85C1E9" />
    </svg>
  );
}
function IVDripStand() {
  return (
    <svg width="60" height="120" viewBox="0 0 70 140" className="block">
      <line x1="35" y1="10" x2="35" y2="120" stroke="#95A5A6" strokeWidth="4" />
      <line x1="10" y1="130" x2="60" y2="130" stroke="#95A5A6" strokeWidth="4" />
      <line x1="35" y1="120" x2="35" y2="130" stroke="#95A5A6" strokeWidth="4" />
      <path d="M22,10 h26 l-6,26 h-14 z" fill="#EAF4FC" stroke="#85C1E9" strokeWidth="2" />
      <rect x="27" y="36" width="16" height="30" rx="3" fill="#D6EAF8" stroke="#85C1E9" strokeWidth="1.5" />
      <line x1="35" y1="66" x2="35" y2="90" stroke="#85C1E9" strokeWidth="2" />
    </svg>
  );
}
function FirstAidBox() {
  return (
    <svg width="90" height="80" viewBox="0 0 100 90" className="block">
      <rect x="8" y="24" width="84" height="56" rx="6" fill="#ECF0F1" stroke="#BDC3C7" strokeWidth="2" />
      <rect x="30" y="8" width="40" height="20" rx="4" fill="#BDC3C7" />
      <rect x="16" y="40" width="68" height="28" rx="4" fill="#E74C3C" />
      <rect x="44" y="46" width="12" height="16" fill="#FFFFFF" />
      <rect x="38" y="52" width="24" height="4" fill="#FFFFFF" />
    </svg>
  );
}

function HospitalScene() {
  const baseDelay = TITLE_DONE + 0.2;
  return (
    <div className="flex items-end justify-center gap-4 sm:gap-6 overflow-visible flex-wrap">
      <StickMount index={0} stickHeight={30} baseDelay={baseDelay}><Greenery /></StickMount>
      <StickMount index={1} stickHeight={24} baseDelay={baseDelay}><StethoscopeCutout /></StickMount>
      <StickMount index={2} stickHeight={48} baseDelay={baseDelay}><HospitalBuilding /></StickMount>
      <StickMount index={3} stickHeight={16} baseDelay={baseDelay}><Ambulance /></StickMount>
      <StickMount index={4} stickHeight={16} baseDelay={baseDelay}><IVDripStand /></StickMount>
      <StickMount index={5} stickHeight={28} baseDelay={baseDelay}><FirstAidBox /></StickMount>
    </div>
  );
}

const SCENE_DONE = TITLE_DONE + 0.2 + 5 * 0.2 + 2.2; // last stick's delay + its own duration
const TRANSITION_PAUSE = 1.2;
const DISSOLVE_DURATION = 0.8;

export function Landing({ onDone }: { onDone: () => void }) {
  const reduced = !!useReducedMotion();
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    const holdMs = reduced ? 900 : (SCENE_DONE + TRANSITION_PAUSE) * 1000;
    const holdTimer = setTimeout(() => setDissolving(true), holdMs);
    const doneTimer = setTimeout(onDone, holdMs + DISSOLVE_DURATION * 1000);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-10 overflow-visible w-full"
      animate={dissolving ? { filter: "blur(20px)", opacity: 0 } : { filter: "blur(0px)", opacity: 1 }}
      transition={{ duration: DISSOLVE_DURATION, ease: "easeInOut" }}
    >
      <MedicoTitle />
      <HospitalScene />
    </motion.div>
  );
}
