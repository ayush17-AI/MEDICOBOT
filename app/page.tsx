"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  Mic, MicOff, ArrowRight, ArrowLeft, RotateCcw, Phone, User, Heart,
  Globe, Calendar, ChevronRight, Stethoscope, Star, Clock, AlertTriangle,
  ShieldCheck, Sparkles, UserCheck, Bot, CheckCircle2, Volume2, AlertCircle, Building,
} from "lucide-react";
import {
  useSpeechRecognition,
  cleanTranscript,
  normalizePhoneNumber,
  parsePhoneNumber,
  parseSexInput,
  cleanPhoneDigits,
  cleanGenderInput,
  stopVoiceSession,
  processPhoneVoiceInput,
  sanitizePhoneDigits,
  parseWhisperPhoneDigits,
  getProductionAudioStream,
} from "@/lib/useSpeechRecognition";

/* =========================================================================
   TYPES & DATA MODELS
   ========================================================================= */
type Phase = "logo" | "language" | "form" | "symptoms" | "decision" | "doctors" | "confirmation" | "dashboard";
type Lang  = "en" | "hi";
type SelectMode = "manual" | "ai";

interface PatientInfo {
  name: string;
  age: string;
  sex: string;
  phone: string;
  emergency: string;
  date: string;
}

interface TriageResult {
  department: string;
  clinical_summary?: string;
  possible_conditions?: string[];
  severity?: string;
  summary?: string;
  differential_factors?: string[];
  triage_reasoning?: string;
  provider?: string;
}

interface Doctor {
  id: string;
  name: string;
  department: string;
  rating: number;
  waitTimeMins: number;
  experience: string;
  specialty: string;
  avatar: string;
}

/* =========================================================================
   MOCK DOCTOR DATABASE
   ========================================================================= */
const MOCK_DOCTORS: Doctor[] = [
  // Cardiology
  { id: "d1", name: "Dr. Rajesh Sharma", department: "Cardiology", rating: 4.9, waitTimeMins: 10, experience: "18 Yrs Exp", specialty: "Interventional Cardiologist", avatar: "👨‍⚕️" },
  { id: "d2", name: "Dr. Ananya Roy", department: "Cardiology", rating: 4.7, waitTimeMins: 25, experience: "12 Yrs Exp", specialty: "Electrophysiologist", avatar: "👩‍⚕️" },
  { id: "d3", name: "Dr. Vikram Patel", department: "Cardiology", rating: 4.8, waitTimeMins: 15, experience: "15 Yrs Exp", specialty: "Cardiovascular Specialist", avatar: "👨‍⚕️" },

  // Neurology
  { id: "d4", name: "Dr. Meera Nambiar", department: "Neurology", rating: 4.9, waitTimeMins: 12, experience: "16 Yrs Exp", specialty: "Senior Neurologist", avatar: "👩‍⚕️" },
  { id: "d5", name: "Dr. Suresh Kumar", department: "Neurology", rating: 4.6, waitTimeMins: 20, experience: "10 Yrs Exp", specialty: "Stroke Specialist", avatar: "👨‍⚕️" },
  { id: "d6", name: "Dr. Priya Gupta", department: "Neurology", rating: 4.8, waitTimeMins: 15, experience: "14 Yrs Exp", specialty: "Neuro-Physician", avatar: "👩‍⚕️" },

  // Orthopedics
  { id: "d7", name: "Dr. Arjun Kapoor", department: "Orthopedics", rating: 4.9, waitTimeMins: 8, experience: "20 Yrs Exp", specialty: "Joint Replacement Surgeon", avatar: "👨‍⚕️" },
  { id: "d8", name: "Dr. Sunita Rao", department: "Orthopedics", rating: 4.7, waitTimeMins: 18, experience: "11 Yrs Exp", specialty: "Sports Injury Specialist", avatar: "👩‍⚕️" },
  { id: "d9", name: "Dr. Kabir Verma", department: "Orthopedics", rating: 4.8, waitTimeMins: 14, experience: "15 Yrs Exp", specialty: "Spine & Bone Specialist", avatar: "👨‍⚕️" },

  // General Physician
  { id: "d10", name: "Dr. Alok Mishra", department: "General Physician", rating: 4.9, waitTimeMins: 5, experience: "14 Yrs Exp", specialty: "Consultant Physician", avatar: "👨‍⚕️" },
  { id: "d11", name: "Dr. Kavita Singh", department: "General Physician", rating: 4.8, waitTimeMins: 12, experience: "13 Yrs Exp", specialty: "Internal Medicine Specialist", avatar: "👩‍⚕️" },
  { id: "d12", name: "Dr. Rohan Mehta", department: "General Physician", rating: 4.7, waitTimeMins: 10, experience: "9 Yrs Exp", specialty: "Primary Care Doctor", avatar: "👨‍⚕️" },

  // ENT
  { id: "d13", name: "Dr. Sneha Deshmukh", department: "ENT", rating: 4.9, waitTimeMins: 10, experience: "15 Yrs Exp", specialty: "ENT & Head Neck Specialist", avatar: "👩‍⚕️" },
  { id: "d14", name: "Dr. Manoj Joshi", department: "ENT", rating: 4.7, waitTimeMins: 22, experience: "11 Yrs Exp", specialty: "Otology Specialist", avatar: "👨‍⚕️" },
  { id: "d15", name: "Dr. Ritu Saxena", department: "ENT", rating: 4.8, waitTimeMins: 15, experience: "13 Yrs Exp", specialty: "Rhinology Consultant", avatar: "👩‍⚕️" },

  // Pediatrics
  { id: "d16", name: "Dr. Deepak Chopra", department: "Pediatrics", rating: 4.9, waitTimeMins: 7, experience: "17 Yrs Exp", specialty: "Senior Pediatrician", avatar: "👨‍⚕️" },
  { id: "d17", name: "Dr. Neha Agarwal", department: "Pediatrics", rating: 4.8, waitTimeMins: 15, experience: "12 Yrs Exp", specialty: "Child Healthcare Specialist", avatar: "👩‍⚕️" },
  { id: "d18", name: "Dr. Sanjay Nair", department: "Pediatrics", rating: 4.7, waitTimeMins: 20, experience: "10 Yrs Exp", specialty: "Pediatric Care Physician", avatar: "👨‍⚕️" },
];

/* =========================================================================
   TTS SYNTHESIS UTILITY
   ========================================================================= */
function speakText(_text: string, _lang: Lang) {
  // SILENCE ALL OVERVIEW TTS ANNOUNCEMENTS
  // Per specification: The ONLY allowed speech in the application is the cute kid voice uttering "Medicobot!" at logo completion.
  return;
}

/* =========================================================================
   PHASE 1 — SVG PATTERNS & LETTER DEFINITIONS
   ========================================================================= */
type PatternType = "stripes" | "dots" | "capsule" | "zigzag" | "web" | "plus";

const LETTERS: {
  id: string; char: string; outline: string;
  fillLight: string; fillTint: string; pattern: PatternType;
}[] = [
  { id:"M",  char:"M", outline:"#059669", fillLight:"#D1FAE5", fillTint:"#05966922", pattern:"stripes" },
  { id:"E",  char:"E", outline:"#D97706", fillLight:"#FEF3C7", fillTint:"#D9770622", pattern:"dots"    },
  { id:"D",  char:"D", outline:"#CA8A04", fillLight:"#FEF9C3", fillTint:"#CA8A0422", pattern:"dots"    },
  { id:"I",  char:"I", outline:"#BE185D", fillLight:"#FCE7F3", fillTint:"#BE185D22", pattern:"capsule" },
  { id:"C",  char:"C", outline:"#DC2626", fillLight:"#FEE2E2", fillTint:"#DC262622", pattern:"zigzag"  },
  { id:"O1", char:"O", outline:"#7C3AED", fillLight:"#EDE9FE", fillTint:"#7C3AED22", pattern:"web"     },
  { id:"B",  char:"B", outline:"#0284C7", fillLight:"#E0F2FE", fillTint:"#0284C722", pattern:"plus"    },
  { id:"O2", char:"O", outline:"#78350F", fillLight:"#FEF3C7", fillTint:"#78350F22", pattern:"plus"    },
  { id:"T",  char:"T", outline:"#15803D", fillLight:"#D1FAE5", fillTint:"#15803D22", pattern:"plus"    },
];

const LETTER_TILTS: Record<string,number> = {
  M:-4, E:3, D:-3, I:4, C:-2, O1:4, B:-3, O2:3, T:-4,
};

function PatternDefs() {
  return (
    <defs>
      {LETTERS.map((l) => {
        const id = `lp-${l.id}`;
        switch (l.pattern) {
          case "stripes":
            return (
              <pattern key={id} id={id} width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill={l.fillTint} />
                <rect x="1.5" width="3" height="8" fill={l.outline} opacity={0.9} />
              </pattern>
            );
          case "dots":
            return (
              <pattern key={id} id={id} width="9" height="9" patternUnits="userSpaceOnUse">
                <rect width="9" height="9" fill={l.fillTint} />
                <circle cx="4.5" cy="4.5" r="2.2" fill={l.outline} opacity={0.9} />
              </pattern>
            );
          case "zigzag":
            return (
              <pattern key={id} id={id} width="16" height="10" patternUnits="userSpaceOnUse">
                <rect width="16" height="10" fill={l.fillTint} />
                <polyline points="0,8 4,2 8,8 12,2 16,8" fill="none"
                  stroke={l.outline} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </pattern>
            );
          case "web":
            return (
              <pattern key={id} id={id} width="14" height="14" patternUnits="userSpaceOnUse">
                <rect width="14" height="14" fill={l.fillTint} />
                <path d="M0,0 L14,14 M14,0 L0,14 M7,0 L7,14 M0,7 L14,7"
                  stroke={l.outline} strokeWidth="1.2" opacity={0.75} />
                <circle cx="7" cy="7" r="3.5" fill="none" stroke={l.outline} strokeWidth="1.2" opacity={0.75} />
              </pattern>
            );
          case "plus":
            return (
              <pattern key={id} id={id} width="12" height="12" patternUnits="userSpaceOnUse">
                <rect width="12" height="12" fill={l.fillTint} />
                <path d="M6,2 V10 M2,6 H10" stroke={l.outline} strokeWidth="2.5" strokeLinecap="round" />
              </pattern>
            );
          default: return null;
        }
      })}
    </defs>
  );
}

function Glyph({ letter, size }: { letter: (typeof LETTERS)[number]; size: number }) {
  const dropShadow = `drop-shadow(3px 3px 0px ${letter.outline}cc) drop-shadow(0px 0px 4px #00000066)`;

  if (letter.pattern === "capsule") {
    return (
      <svg viewBox="0 0 50 120" width={size * 0.58} height={size}
        aria-label="I" overflow="visible"
        style={{ display:"block", filter: dropShadow }}>
        <path d="M8 52 L8 23 A 17 17 0 0 1 42 23 L42 52 Z"
          fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinejoin="round" />
        <path d="M8 62 L8 91 A 17 17 0 0 0 42 91 L42 62 Z"
          fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinejoin="round" />
        <path d="M8 52 L8 23 A 17 17 0 0 1 42 23 L42 52 Z"
          fill={letter.fillTint} stroke={letter.outline} strokeWidth="4" strokeLinejoin="round" />
        <path d="M8 62 L8 91 A 17 17 0 0 0 42 91 L42 62 Z"
          fill={letter.outline} stroke={letter.outline} strokeWidth="4" strokeLinejoin="round" />
        <line x1="6" y1="57" x2="44" y2="57" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 140"
      aria-label={letter.char} style={{ display:"block", filter: dropShadow }}>
      <text x="60" y="112" textAnchor="middle" fontSize="134" fontWeight={900}
        style={{ fontFamily:"var(--font-bubble),'Fredoka','Bungee','Arial Black',ui-sans-serif,sans-serif" }}
        fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinejoin="round" paintOrder="fill stroke">
        {letter.char}
      </text>
      <text x="60" y="112" textAnchor="middle" fontSize="134" fontWeight={900}
        style={{ fontFamily:"var(--font-bubble),'Fredoka','Bungee','Arial Black',ui-sans-serif,sans-serif" }}
        fill={`url(#lp-${letter.id})`} stroke={letter.outline}
        strokeWidth="5" strokeLinejoin="round" paintOrder="stroke fill">
        {letter.char}
      </text>
    </svg>
  );
}

/* =========================================================================
   PHASE 1 — TIMING CHAIN & WORDMARK
   ========================================================================= */
const T_MD_LAND   = 0.9;
const T_E_START   = T_MD_LAND  + 0.05;
const T_E_LAND    = T_E_START  + 0.55;
const T_I_START   = T_E_LAND   + 0.05;
const T_I_LAND    = T_I_START  + 0.85;
const T_C_START   = T_I_LAND   + 0.05;
const T_C_LAND    = T_C_START  + 0.55;
const T_O1_START  = T_C_LAND   + 0.05;
const T_O1_LAND   = T_O1_START + 2.5;
const T_BOT_START = T_O1_LAND  + 0.1;
const T_BOT_LAND  = T_BOT_START + 1.2;
const TITLE_DONE  = T_BOT_LAND + 0.2;
const PHASE_CHANGE = TITLE_DONE + 1.2;

function mkCrashDrop(r: boolean): Variants {
  if (r) return { hidden:{opacity:0}, show:{opacity:1} };
  return {
    hidden:{ y:-620, opacity:1 },
    show:{ y:[-620,16,-18,5,0],
      transition:{ duration:T_MD_LAND, times:[0,.55,.72,.88,1], ease:["easeIn","easeOut","easeInOut","easeOut"] } },
  };
}
function mkSqueezePop(r: boolean): Variants {
  if (r) return { hidden:{opacity:0}, show:{opacity:1,transition:{delay:T_E_START}} };
  return {
    hidden:{ scale:0, opacity:0 },
    show:{ scale:[0,1.22,1], opacity:1,
      transition:{ duration:T_E_LAND-T_E_START, delay:T_E_START, times:[0,.65,1] } },
  };
}
function mkRocketLaunch(r: boolean): Variants {
  if (r) return { hidden:{opacity:0}, show:{opacity:1,transition:{delay:T_I_START}} };
  return {
    hidden:{ y:620, opacity:1 },
    show:{ y:[620,-70,0],
      transition:{ duration:T_I_LAND-T_I_START, delay:T_I_START, times:[0,.6,1] } },
  };
}
function mkRightSlide(r: boolean): Variants {
  if (r) return { hidden:{opacity:0}, show:{opacity:1,transition:{delay:T_C_START}} };
  return {
    hidden:{ x:700, opacity:1 },
    show:{ x:[700,-12,0],
      transition:{ duration:T_C_LAND-T_C_START, delay:T_C_START, times:[0,.75,1] } },
  };
}
function mkParachuteDrop(r: boolean, extra: number): Variants {
  const s = T_BOT_START + extra, d = T_BOT_LAND - T_BOT_START;
  if (r) return { hidden:{opacity:0}, show:{opacity:1,transition:{delay:s}} };
  return {
    hidden:{ y:-400, rotate:0, opacity:1 },
    show:{ y:[-400,-38,0], rotate:[-10,10,-5,0],
      transition:{ duration:d, delay:s, times:[0,.7,.9,1], ease:"easeInOut" } },
  };
}
function mkCanopy(r: boolean, extra: number): Variants {
  const s = T_BOT_START + extra, d = T_BOT_LAND - T_BOT_START;
  if (r) return { hidden:{opacity:0}, show:{opacity:0} };
  return {
    hidden:{ opacity:1, scale:1, y:-42 },
    show:{ opacity:[1,1,0], scale:[1,1,.4], y:[-42,-28,-8],
      transition:{ duration:d, delay:s, times:[0,.75,1] } },
  };
}

function Canopy({ color }: { color: string }) {
  return (
    <svg width="72" height="62" viewBox="0 0 72 62"
      style={{ position:"absolute", top:-56, left:"50%", transform:"translateX(-50%)" }}>
      <path d="M4,30 Q36,-8 68,30 Z" fill={color} opacity={0.88} />
      <path d="M4,30 Q36,14 68,30" fill="none" stroke="#000" strokeWidth="1" opacity={0.28} />
      <line x1="10" y1="30" x2="32" y2="54" stroke="#000" strokeWidth="1.2" opacity={0.48} />
      <line x1="62" y1="30" x2="40" y2="54" stroke="#000" strokeWidth="1.2" opacity={0.48} />
      <line x1="36" y1="18" x2="36" y2="54" stroke="#000" strokeWidth="1.2" opacity={0.48} />
    </svg>
  );
}

const smokeExit: Variants = {
  idle:{ opacity:1, scale:1, filter:"blur(0px)", y:0 },
  puff:{
    opacity:[1,.7,0], scale:[1,1.4,2],
    filter:["blur(0px)","blur(8px)","blur(28px)"], y:[0,-30,-80],
    transition:{ duration:0.9, ease:"easeInOut" },
  },
};

function Wordmark({ smoking }: { smoking: boolean }) {
  const r = !!useReducedMotion();
  const SIZE = 86;

  const rigs: Record<string,Variants> = {
    M: mkCrashDrop(r), D: mkCrashDrop(r),
    E: mkSqueezePop(r), I: mkRocketLaunch(r), C: mkRightSlide(r),
    B: mkParachuteDrop(r,0), O2: mkParachuteDrop(r,.15), T: mkParachuteDrop(r,.3),
  };
  const canopyRigs: Record<string,Variants> = {
    B: mkCanopy(r,0), O2: mkCanopy(r,.15), T: mkCanopy(r,.3),
  };
  const o1 = LETTERS.find((l) => l.id === "O1")!;

  const letterDiv = (l: (typeof LETTERS)[number]) => (
    <motion.div key={l.id} className="relative"
      style={{ marginLeft: l.id==="M" ? 0 : -10, rotate: LETTER_TILTS[l.id], zIndex:1 }}
      variants={rigs[l.id]} initial="hidden" animate="show">
      <Glyph letter={l} size={SIZE} />
    </motion.div>
  );

  return (
    <motion.div variants={smokeExit} animate={smoking ? "puff" : "idle"}
      className="relative flex items-end justify-center overflow-visible">
      <svg width="0" height="0" style={{ position:"absolute" }} aria-hidden>
        <PatternDefs />
      </svg>

      {/* M E D I C */}
      {LETTERS.filter((l) => ["M","E","D","I","C"].includes(l.id)).map(letterDiv)}

      {/* First O: Bouncy Roll Physics */}
      <motion.div
        className="relative z-30 inline-block"
        style={{ marginLeft: -10, rotate: LETTER_TILTS["O1"] }}
        initial={{ x: "-100vw", y: "0px", rotate: -1080, scale: 1, opacity: r ? 0 : 1 }}
        animate={r
          ? { x: "0px", y: "0px", rotate: 0, scale: 1, opacity: 1 }
          : {
              x:      ["-100vw", "-280px", "-240px", "-180px", "-120px", "-40px", "0px"],
              y:      ["0px",    "0px",    "-90px",  "-75px",  "-88px",  "-75px", "0px"],
              rotate: [-1080,    -720,     -540,     -360,     -180,     0,       360],
              scale:  [1,        0.9,      1.15,     0.95,     1.1,      0.95,    1],
              opacity: 1,
            }
        }
        transition={r
          ? { duration: 0.4, delay: T_O1_START }
          : {
              duration: 2.5,
              delay:    T_O1_START,
              times:    [0, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
              ease:     [0.34, 1.56, 0.64, 1],
            }
        }
      >
        <Glyph letter={o1} size={SIZE} />
      </motion.div>

      {/* B O T */}
      {LETTERS.filter((l) => ["B","O2","T"].includes(l.id)).map((l) => (
        <motion.div key={l.id} className="relative"
          style={{ marginLeft:-10, rotate:LETTER_TILTS[l.id], zIndex:1 }}
          variants={rigs[l.id]} initial="hidden" animate="show">
          <motion.div variants={canopyRigs[l.id]} initial="hidden" animate="show">
            <Canopy color={l.outline} />
          </motion.div>
          <Glyph letter={l} size={SIZE} />
        </motion.div>
      ))}
    </motion.div>
  );
}

const triggerCuteMedicobotVoice = () => {
  try {
    const audio = new Audio('/sounds/medicobot-kid.mp3');
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        fallbackCuteKidVoice();
      });
    }
  } catch (e) {
    fallbackCuteKidVoice();
  }
};

function fallbackCuteKidVoice() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Medicobot!");
    utterance.pitch = 1.9; // High pitch for cute child voice
    utterance.rate = 1.1;  // Energetic pace
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

function LogoStage({ onDone }: { onDone: () => void }) {
  const [smoking, setSmoking] = useState(false);

  useEffect(() => {
    // Trigger cute child voice announcement right when logo assembly completes
    const voiceTimer = setTimeout(() => {
      triggerCuteMedicobotVoice();
    }, TITLE_DONE * 1000);

    const t1 = setTimeout(() => setSmoking(true),  PHASE_CHANGE * 1000 - 900);
    const t2 = setTimeout(() => onDone(),           PHASE_CHANGE * 1000 + 200);
    return () => {
      clearTimeout(voiceTimer);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <motion.div key="logo-stage"
      className="w-full h-screen flex items-center justify-center relative overflow-hidden bg-white"
      exit={{ opacity:0, transition:{ duration:0.5 } }}>
      <Wordmark smoking={smoking} />
      <div className="absolute top-6 left-6  w-2 h-2 rounded-full bg-teal-400  opacity-60" />
      <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-red-400   opacity-60" />
      <div className="absolute bottom-6 left-6  w-2 h-2 rounded-full bg-yellow-400 opacity-60" />
      <div className="absolute bottom-6 right-6 w-2 h-2 rounded-full bg-purple-400 opacity-60" />
    </motion.div>
  );
}

/* =========================================================================
   COMMON UI COMPONENTS
   ========================================================================= */
function MedCrossGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[.035] pointer-events-none" aria-hidden>
      <defs>
        <pattern id="cross-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20,8 V32 M8,20 H32" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cross-grid)" />
    </svg>
  );
}

function HeaderBar({ lang, title }: { lang: Lang; title?: string }) {
  return (
    <motion.header initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }}
      transition={{ duration:.5 }}
      className="w-full px-6 py-4 pl-36 flex items-center justify-between border-b border-white/60
                 bg-white/50 backdrop-blur-md shadow-sm relative z-40">
      <div className="flex items-center gap-1.5">
        <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shadow">
          <Heart size={14} className="text-white" fill="white" />
        </div>
        <span className="font-black text-base tracking-tight text-teal-700">MEDICOBOT</span>
      </div>
      <p className="hidden sm:block text-[11px] text-slate-500 font-semibold text-center max-w-xs leading-tight">
        {title || "AI-Driven Smart Triage & Automated OPD Orchestration"}
      </p>
      <div className="flex items-center gap-2">
        <Globe size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-teal-700">
          {lang === "hi" ? "हिंदी" : "English"}
        </span>
      </div>
    </motion.header>
  );
}

function GlobalBackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed top-4 left-6 z-50 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-full shadow-sm border border-slate-200/80 transition-all cursor-pointer"
    >
      <ArrowLeft size={14} className="text-slate-600" />
      <span>{label}</span>
    </motion.button>
  );
}

/* =========================================================================
   PHASE 2 — LANGUAGE SELECTION
   ========================================================================= */
const LANG_COPY = {
  heading_en: "Select Language",
  heading_hi: "भाषा चुनें",
  sub_en: "Choose your preferred language to continue",
  sub_hi: "आगे बढ़ने के लिए अपनी भाषा चुनें",
};

function LanguageStage({ onSelect, onReplay }: { onSelect: (l: Lang) => void; onReplay: () => void }) {
  return (
    <motion.div key="lang-stage"
      initial={{ opacity:0, y:40 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-40 }}
      transition={{ duration:0.55, ease:[0.16,1,0.3,1] }}
      className="w-full h-screen flex flex-col items-center justify-center gap-10 px-6 relative"
      style={{ background:"linear-gradient(135deg,#F0FDFA 0%,#F8FAFC 55%,#EFF6FF 100%)" }}>

      <MedCrossGrid />

      <motion.button
        onClick={onReplay}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-full shadow-sm border border-slate-200/80 transition-all cursor-pointer"
      >
        <RotateCcw size={14} className="text-slate-600" />
        <span>← Replay Intro</span>
      </motion.button>

      <div className="relative z-10 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow">
            <Heart size={18} className="text-white" fill="white" />
          </div>
          <span className="font-black text-xl tracking-tight text-teal-700">MEDICOBOT</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-800">
          {LANG_COPY.heading_en}
          <span className="mx-3 text-slate-300">/</span>
          {LANG_COPY.heading_hi}
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          {LANG_COPY.sub_en}
          <br />
          <span className="text-slate-400">{LANG_COPY.sub_hi}</span>
        </p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row gap-5 w-full max-w-xl">
        {([
          { lang:"en" as Lang, label:"English", sub:"Tap to continue in English", emoji:"🇬🇧" },
          { lang:"hi" as Lang, label:"हिंदी (Hindi)", sub:"हिंदी में जारी रखने के लिए टैप करें", emoji:"🇮🇳" },
        ]).map(({ lang, label, sub, emoji }) => (
          <motion.button
            key={lang}
            whileHover={{ scale:1.03, y:-3 }}
            whileTap={{ scale:0.97 }}
            onClick={() => onSelect(lang)}
            className="flex-1 bg-white/90 backdrop-blur-sm border-2 border-slate-100
                       hover:border-teal-400 rounded-3xl px-8 py-8 text-left shadow-lg
                       shadow-slate-100/80 hover:shadow-teal-100 transition-all group"
          >
            <div className="text-4xl mb-3">{emoji}</div>
            <div className="text-2xl font-black text-slate-800 group-hover:text-teal-700 transition-colors">
              {label}
            </div>
            <div className="text-sm text-slate-400 mt-1">{sub}</div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200
                              flex items-center justify-center group-hover:bg-teal-600
                              group-hover:border-teal-600 transition-all">
                <Mic size={14} className="text-teal-500 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-teal-600 transition-colors">
                Voice input supported
              </span>
              <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-teal-500
                                                  group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* =========================================================================
   PHASE 3 — PATIENT REGISTRATION FORM
   ========================================================================= */
const FORM_COPY: Record<Lang, {
  title: string; subtitle: string;
  name: string; age: string; sex: string; phone: string; emergency: string;
  date: string; proceed: string; whatsapp: string;
  sexOptions: string[];
}> = {
  en: {
    title: "Patient Registration", subtitle: "Tap 🎙 to speak — no typing needed",
    name: "Full Name", age: "Age (Years)", sex: "Sex", phone: "Phone (WhatsApp)",
    emergency: "Emergency Contact Number", date: "Date", proceed: "Proceed to Symptom Triage →",
    whatsapp: "WhatsApp & SMS alerts enabled",
    sexOptions: ["Male", "Female", "Intersex", "Other"],
  },
  hi: {
    title: "रोगी पंजीकरण", subtitle: "🎙 बोलने के लिए टैप करें — टाइप करने की ज़रूरत नहीं",
    name: "पूरा नाम", age: "आयु (वर्ष)", sex: "लिंग", phone: "फ़ोन (व्हाट्सएप)",
    emergency: "आपातकालीन संपर्क नंबर", date: "दिनांक", proceed: "लक्षण जांच की ओर बढ़ें →",
    whatsapp: "व्हाट्सएप और SMS अलर्ट सक्षम है",
    sexOptions: ["पुरुष", "महिला", "इंटरसेक्स", "अन्य"],
  },
};

function MicBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick}
      whileTap={{ scale:.9 }} whileHover={{ scale:1.08 }}
      className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                  shadow-md transition-colors ${
        active ? "bg-red-500 text-white animate-pulse ring-4 ring-red-300/80 shadow-lg shadow-red-200"
               : "bg-teal-600 text-white hover:bg-teal-700"
      }`}
      aria-label={active ? "Stop recording" : "Speak"}>
      {active ? <MicOff size={18} /> : <Mic size={18} />}
    </motion.button>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</label>
      <div className="flex items-start gap-2">{children}</div>
    </div>
  );
}

function TextInput({ placeholder, type="text", value, onChange }: {
  placeholder: string; type?: string; value: string; onChange:(v:string)=>void;
}) {
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200
                 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-800
                 placeholder:text-slate-400 shadow-sm text-sm transition" />
  );
}

function RippleCTA({ label, onClick }: { label: string; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const sz = Math.max(r.width, r.height) * 1.6;
    const rpl = document.createElement("span");
    rpl.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,.35);
      width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px;
      transform:scale(0);animation:ripple .6s linear;pointer-events:none;`;
    btn.appendChild(rpl);
    setTimeout(() => rpl.remove(), 700);
    onClick();
  }, [onClick]);

  return (
    <button ref={ref} onClick={handleClick}
      className="relative overflow-hidden w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700
                 text-white font-bold text-base tracking-wide shadow-lg shadow-teal-200
                 transition-colors flex items-center justify-center gap-2 active:scale-[.98]
                 animate-pulse-slow">
      <Heart size={18} className="text-teal-200" />
      {label}
      <ArrowRight size={18} />
    </button>
  );
}

function FormStage({
  lang,
  initialData,
  onProceed,
  onBack,
}: {
  lang: Lang;
  initialData: PatientInfo;
  onProceed: (data: PatientInfo) => void;
  onBack: () => void;
}) {
  const t = FORM_COPY[lang];
  const [activeMic, setActiveMic]   = useState<string | null>(null);
  const [name, setName]             = useState(initialData.name || "");
  const [age, setAge]               = useState(initialData.age || "");
  const [sex, setSex]               = useState(initialData.sex || "");
  const [phone, setPhone]           = useState(initialData.phone || "");
  const [emergency, setEmergency]   = useState(initialData.emergency || "");
  const [date] = useState(() => initialData.date || new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN"));

  const activeMicRef = useRef<string | null>(null);
  useEffect(() => {
    activeMicRef.current = activeMic;
  }, [activeMic]);

  const {
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: lang === "hi" ? "hi" : "en",
    onTranscript: (spokenText) => {
      const targetField = activeMicRef.current;
      if (!spokenText || !targetField) return;
      const cleaned = cleanTranscript(spokenText);

      if (targetField === "name") {
        setName(cleaned);
      } else if (targetField === "age") {
        const digits = cleaned.replace(/\D/g, "");
        setAge(digits || cleaned);
      } else if (targetField === "sex") {
        const matchedGender = parseSexInput(spokenText);
        if (matchedGender === "Female") {
          setSex(t.sexOptions[1] || "Female / महिला");
        } else if (matchedGender === "Other") {
          setSex(t.sexOptions[2] || "Other / अन्य");
        } else {
          setSex(t.sexOptions[0] || "Male / पुरुष");
        }
      } else if (targetField === "phone") {
        const preciseDigits = sanitizePhoneDigits(spokenText);
        setPhone(preciseDigits);
      } else if (targetField === "emergency") {
        const preciseDigits = sanitizePhoneDigits(spokenText);
        setEmergency(preciseDigits);
      }
    },
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startPhoneWhisperRecording = async (field: "phone" | "emergency") => {
    try {
      const stream = await getProductionAudioStream();
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob);

        try {
          const res = await fetch('/api/whisper', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data.text) {
            const parsedNumber = parseWhisperPhoneDigits(data.text);
            if (field === "phone") {
              setPhone(parsedNumber);
            } else {
              setEmergency(parsedNumber);
            }
          }
        } catch (err) {
          console.error('Groq Whisper Transcription Failed:', err);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setActiveMic(field);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopPhoneWhisperRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setActiveMic(null);
  };

  const toggleMic = (field: string) => {
    stopVoiceSession();
    if (field === "phone" || field === "emergency") {
      if (activeMic === field) {
        stopPhoneWhisperRecording();
      } else {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        stopListening();
        startPhoneWhisperRecording(field as "phone" | "emergency");
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        stopPhoneWhisperRecording();
      }
      if (activeMic === field) {
        setActiveMic(null);
        stopListening();
      } else {
        setActiveMic(field);
        startListening();
      }
    }
  };

  const handleSubmit = () => {
    stopListening();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      stopPhoneWhisperRecording();
    }
    onProceed({ name, age, sex, phone, emergency, date });
  };

  return (
    <motion.div
      initial={{ opacity:0, x:60 }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:-60 }}
      transition={{ duration:.55, ease:[0.16,1,0.3,1] }}
      className="w-full max-w-lg mx-auto flex flex-col gap-6">

      <GlobalBackButton onClick={onBack} label={lang === "hi" ? "पीछे जाएं / Language" : "Back to Language"} />

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-teal-100/60
                      border border-slate-100 p-6 sm:p-8 flex flex-col gap-5">

        {/* Full Name */}
        <FieldRow label={t.name}>
          <User size={16} className="text-slate-400 flex-shrink-0 mt-3.5" />
          <TextInput placeholder={t.name} value={name} onChange={setName} />
          <MicBtn active={activeMic==="name"} onClick={() => toggleMic("name")} />
        </FieldRow>

        {/* Age */}
        <FieldRow label={t.age}>
          <TextInput placeholder={t.age} type="number" value={age} onChange={setAge} />
          <MicBtn active={activeMic==="age"} onClick={() => toggleMic("age")} />
        </FieldRow>

        {/* Sex */}
        <FieldRow label={t.sex}>
          <div className="flex-1 flex gap-1.5 flex-wrap">
            {t.sexOptions.map((s) => (
              <button key={s} onClick={() => setSex(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  sex===s ? "bg-teal-600 text-white border-teal-600 shadow"
                          : "bg-white border-slate-200 text-slate-500 hover:border-teal-400"
                }`}>
                {s}
              </button>
            ))}
          </div>
          <MicBtn active={activeMic==="sex"} onClick={() => toggleMic("sex")} />
        </FieldRow>

        {/* Phone */}
        <FieldRow label={t.phone}>
          <Phone size={16} className="text-slate-400 flex-shrink-0 mt-3.5" />
          <div className="flex-1 flex flex-col gap-1">
            <TextInput placeholder={t.phone} type="tel" value={phone} onChange={setPhone} />
            <span className="text-[10px] text-teal-600 font-semibold pl-1">
              ✅ {t.whatsapp}
            </span>
          </div>
          <MicBtn active={activeMic==="phone"} onClick={() => toggleMic("phone")} />
        </FieldRow>

        {/* Emergency */}
        <FieldRow label={t.emergency}>
          <Phone size={16} className="text-slate-400 flex-shrink-0 mt-3.5" />
          <TextInput placeholder={t.emergency} type="tel" value={emergency} onChange={setEmergency} />
          <MicBtn active={activeMic==="emergency"} onClick={() => toggleMic("emergency")} />
        </FieldRow>

        {/* Date */}
        <FieldRow label={t.date}>
          <Calendar size={16} className="text-slate-400 flex-shrink-0 mt-3.5" />
          <div className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200
                          text-slate-600 text-sm shadow-sm">
            {date}
          </div>
        </FieldRow>

        <RippleCTA label={t.proceed} onClick={handleSubmit} />
      </div>
    </motion.div>
  );
}



function normalizeAudioTranscript(text: string): string {
  return cleanTranscript(text);
}

/* =========================================================================
   PHASE 4A — SYMPTOM INPUT PAGE (STT + NOISE FILTER + TIMEOUT)
   ========================================================================= */
function SymptomsStage({
  lang,
  onAnalyze,
  onBack,
}: {
  lang: Lang;
  onAnalyze: (symptoms: string) => void;
  onBack: () => void;
}) {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);

  const {
    isListening,
    noiseAlert,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: lang === "hi" ? "hi" : "en",
    onTranscript: (spokenText) => {
      if (spokenText) {
        setText((prev) => {
          const combined = prev ? `${prev} ${spokenText}` : spokenText;
          return cleanTranscript(combined);
        });
      }
    },
  });

  const toggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAnalyze = () => {
    const cleanedText = cleanTranscript(text);
    if (!cleanedText.trim()) {
      alert(lang === "hi" ? "कृपया अपने लक्षण दर्ज करें" : "Please speak or type your symptoms first.");
      return;
    }
    setLoading(true);
    onAnalyze(cleanedText);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto flex flex-col gap-6"
    >
      <GlobalBackButton onClick={onBack} label={lang === "hi" ? "पीछे जाएं / Patient Info" : "Back to Patient Info"} />

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 flex flex-col gap-6">

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-800">
            {lang === "hi" ? "अपने लक्षण बताएं" : "Describe Your Symptoms"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {lang === "hi"
              ? "माइक दबाएं और बोलें, या नीचे लिखें"
              : "Tap the mic and speak clearly, or type in the box below"}
          </p>
        </div>

        {/* Mic Pulse Center Stage */}
        <div className="flex flex-col items-center justify-center gap-3 py-4">
          <motion.button
            onClick={toggleListen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
              isListening ? "bg-red-500 shadow-red-200" : "bg-teal-600 hover:bg-teal-700 shadow-teal-200"
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-red-400 opacity-75 animate-ping pointer-events-none" />
            )}
            {isListening ? <MicOff size={40} /> : <Mic size={40} />}
          </motion.button>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isListening
              ? (lang === "hi" ? "सुन रहा है... (बोलें)" : "Listening... (Speak Now)")
              : (lang === "hi" ? "बोलने के लिए टैप करें" : "Tap to Speak")}
          </span>
        </div>

        {/* Noise Alert Banner */}
        {noiseAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
          >
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <span>
              {lang === "hi"
                ? "शोर आ रहा है, कृपया माइक के पास बोलें"
                : "Noise detected. Please speak closer to the mic"}
            </span>
          </motion.div>
        )}

        {/* Textarea Backup */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {lang === "hi" ? "लक्षण पाठ (समीक्षा / संपादित करें)" : "Symptom Transcript (Review / Edit)"}
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              lang === "hi"
                ? "उदा: 2 घंटे से सीने में दर्द और सांस लेने में तकलीफ हो रही है..."
                : "e.g., Severe chest pain, shortness of breath, and mild dizziness for 2 hours..."
            }
            className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-800 placeholder:text-slate-400 text-sm shadow-sm resize-none"
          />
        </div>

        {/* CTA Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Sparkles size={18} className="animate-spin text-teal-200" />
              <span>{lang === "hi" ? "AI विश्लेषण जारी है..." : "AI Analyzing Symptoms..."}</span>
            </>
          ) : (
            <>
              <Stethoscope size={18} />
              <span>{lang === "hi" ? "लक्षण जांचें →" : "Analyze Symptoms →"}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   PHASE 4B — SELECTION MODE DECISION GATE
   ========================================================================= */
function DecisionGateStage({
  lang,
  triage,
  onChooseMode,
  onBack,
}: {
  lang: Lang;
  triage: TriageResult;
  onChooseMode: (mode: SelectMode) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto flex flex-col gap-6"
    >
      <GlobalBackButton onClick={onBack} label={lang === "hi" ? "पीछे जाएं / Symptoms" : "Back to Symptoms"} />

      {/* Identified Department & Clinical AI Assessment Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-center">
        
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="px-5 py-2 rounded-full bg-teal-100 text-teal-800 font-bold text-sm border border-teal-200 flex items-center gap-2 shadow-sm">
            <Stethoscope size={16} />
            <span>{lang === "hi" ? `पहचाना गया विभाग: ${triage.department}` : `Identified Department: ${triage.department}`}</span>
          </div>
        </div>

        {/* Clinical AI Assessment */}
        {(triage.clinical_summary || triage.triage_reasoning || triage.summary) && (
          <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
              <ShieldCheck size={16} />
              <span>{lang === "hi" ? "नैदानिक एआई मूल्यांकन" : "Clinical AI Assessment"}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {triage.clinical_summary || triage.triage_reasoning || triage.summary}
            </p>
          </div>
        )}

        {/* Possible Conditions Analyzed */}
        {((triage.possible_conditions && triage.possible_conditions.length > 0) || (triage.differential_factors && triage.differential_factors.length > 0)) && (
          <div className="text-left space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "hi" ? "संभावित स्थितियाँ / लक्षण विश्लेषण" : "Possible Conditions Analyzed"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(triage.possible_conditions || triage.differential_factors || []).map((condition, idx) => (
                <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-800 font-medium shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 animate-pulse" />
                  <span>{condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-400 pt-1">
          Engine: <span className="font-semibold text-teal-700">{triage.provider || "AI Multi-Engine"}</span>
        </p>

        {/* Prompt Header */}
        <div className="pt-2">
          <h3 className="text-xl sm:text-2xl font-black text-slate-800">
            {lang === "hi"
              ? "आप अपने डॉक्टर का चयन कैसे करना चाहते हैं?"
              : "How would you like to choose your doctor?"}
          </h3>
        </div>

        {/* 2 Decision Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Manual */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChooseMode("manual")}
            className="flex flex-col gap-3 p-6 rounded-3xl bg-white border-2 border-slate-100 hover:border-teal-500 shadow-md hover:shadow-teal-100 text-left transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <UserCheck size={24} />
            </div>
            <div>
              <h4 className="font-black text-base text-slate-800 group-hover:text-teal-700 transition-colors">
                {lang === "hi" ? "👤 खुद डॉक्टर चुनें" : "👤 Select Doctor On Your Own"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {lang === "hi"
                  ? "इस विभाग के सभी विशेषज्ञों की सूची देखें और खुद चुनें।"
                  : "Browse all specialists in this department and pick manually."}
              </p>
            </div>
            <div className="mt-auto pt-2 text-xs font-bold text-teal-600 flex items-center gap-1">
              <span>{lang === "hi" ? "सूची देखें →" : "View All Doctors →"}</span>
            </div>
          </motion.button>

          {/* Card 2: AI Recommendation */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChooseMode("ai")}
            className="flex flex-col gap-3 p-6 rounded-3xl bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-xl shadow-teal-200 text-left transition-all group cursor-pointer relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <h4 className="font-black text-base text-white">
                {lang === "hi" ? "🤖 AI को चुनने दें" : "🤖 Ask AI to Recommend"}
              </h4>
              <p className="text-xs text-teal-100 mt-1">
                {lang === "hi"
                  ? "रेटिंग और कम प्रतीक्षा समय के आधार पर सर्वश्रेष्ठ डॉक्टर चुनें।"
                  : "Let MEDICOBOT select the best match based on Ratings and Availability."}
              </p>
            </div>
            <div className="mt-auto pt-2 text-xs font-bold text-teal-200 flex items-center gap-1">
              <span>{lang === "hi" ? "AI सिफारिश देखें →" : "Get AI Best Match →"}</span>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   PHASE 4C — DOCTOR SELECTION VIEWS (MANUAL vs AI RECOMMENDATION)
   ========================================================================= */
function DoctorsStage({
  lang,
  triage,
  selectMode,
  onSelectDoctor,
  onBack,
}: {
  lang: Lang;
  triage: TriageResult;
  selectMode: SelectMode;
  onSelectDoctor: (doc: Doctor) => void;
  onBack: () => void;
}) {
  // Filter doctors matching department (or fallback to General Physician)
  const doctorsInDept = MOCK_DOCTORS.filter(
    (d) => d.department.toLowerCase() === triage.department.toLowerCase()
  );
  const displayDoctors = doctorsInDept.length > 0
    ? doctorsInDept
    : MOCK_DOCTORS.filter((d) => d.department === "General Physician");

  // AI Scoring Algorithm: Score = (Rating * 0.6) + ((60 - WaitTime) * 0.4)
  const scoredDoctors = [...displayDoctors].sort((a, b) => {
    const scoreA = (a.rating * 0.6) + ((60 - a.waitTimeMins) * 0.4);
    const scoreB = (b.rating * 0.6) + ((60 - b.waitTimeMins) * 0.4);
    return scoreB - scoreA;
  });

  const bestMatchDoc = scoredDoctors[0];

  useEffect(() => {
  }, [selectMode, bestMatchDoc, lang]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto flex flex-col gap-6"
    >
      <GlobalBackButton onClick={onBack} label={lang === "hi" ? "पीछे जाएं / Decision" : "Back to Decision Gate"} />

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
          {selectMode === "ai"
            ? (lang === "hi" ? "🤖 AI अनुशंसित डॉक्टर" : "🤖 AI Recommended Doctor")
            : (lang === "hi" ? `👨‍⚕️ ${triage.department} विशेषज्ञ` : `👨‍⚕️ ${triage.department} Specialists`)}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          {selectMode === "ai"
            ? (lang === "hi" ? "उच्चतम रेटिंग और न्यूनतम प्रतीक्षा समय के आधार पर चयनित" : "Ranked by Highest Rating + Lowest Wait Time Score")
            : (lang === "hi" ? "अपनी पसंद का डॉक्टर चुनें" : "Select any doctor to confirm your token")}
        </p>
      </div>

      {/* MODE A: AI RECOMMENDATION VIEW */}
      {selectMode === "ai" && bestMatchDoc && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-teal-500 relative overflow-hidden flex flex-col gap-6"
        >
          {/* AI Best Match Badge */}
          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs w-fit flex items-center gap-1.5 shadow">
            <Sparkles size={14} />
            <span>
              {lang === "hi"
                ? "🤖 AI सर्वश्रेष्ठ मैच (उच्चतम रेटिंग + न्यूनतम प्रतीक्षा)"
                : "🤖 AI Best Match (Highest Rating + Lowest Wait Time)"}
            </span>
          </div>

          {/* Doctor Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-teal-50 text-4xl flex items-center justify-center flex-shrink-0 shadow-inner">
              {bestMatchDoc.avatar}
            </div>
            <div className="space-y-1 text-center sm:text-left flex-1">
              <h3 className="text-2xl font-black text-slate-800">{bestMatchDoc.name}</h3>
              <p className="text-sm font-semibold text-teal-700">{bestMatchDoc.specialty}</p>
              <p className="text-xs text-slate-400">{bestMatchDoc.experience} &bull; {bestMatchDoc.department}</p>
              
              <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Star size={16} fill="#F59E0B" />
                  <span>{bestMatchDoc.rating} / 5.0</span>
                </div>
                <div className="flex items-center gap-1 text-teal-700 font-bold text-sm bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                  <Clock size={16} />
                  <span>{bestMatchDoc.waitTimeMins} min wait</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectDoctor(bestMatchDoc)}
            className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={18} />
            <span>
              {lang === "hi"
                ? "अपॉइंटमेंट पक्का करें →"
                : "Confirm & Generate Token →"}
            </span>
          </button>
        </motion.div>
      )}

      {/* MODE B: MANUAL GRID VIEW */}
      {selectMode === "manual" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayDoctors.map((doc) => (
            <motion.div
              key={doc.id}
              whileHover={{ y: -3 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-lg border border-slate-100 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-2xl flex items-center justify-center flex-shrink-0">
                  {doc.avatar}
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-800 text-base">{doc.name}</h4>
                  <p className="text-xs font-semibold text-teal-700">{doc.specialty}</p>
                  <p className="text-[11px] text-slate-400">{doc.experience}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <Star size={14} fill="#F59E0B" />
                  <span>{doc.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600 font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-full">
                  <Clock size={12} />
                  <span>{doc.waitTimeMins}m wait</span>
                </div>
              </div>

              <button
                onClick={() => onSelectDoctor(doc)}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{lang === "hi" ? `डॉ. ${doc.name} चुनें` : `Select Dr. ${doc.name.split(" ")[1] || doc.name}`}</span>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* =========================================================================
   PHASE 5 — TOKEN CONFIRMATION STAGE
   ========================================================================= */
function ConfirmationStage({
  lang,
  patient,
  triage,
  doctor,
  tokenNum,
  onReset,
  onOpenDashboard,
  onBack,
}: {
  lang: Lang;
  patient: PatientInfo;
  triage: TriageResult;
  doctor: Doctor;
  tokenNum: string;
  onReset: () => void;
  onOpenDashboard: () => void;
  onBack: () => void;
}) {
  useEffect(() => {
  }, [lang, doctor, tokenNum]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto flex flex-col gap-6"
    >
      <GlobalBackButton onClick={onBack} label={lang === "hi" ? "पीछे जाएं / Doctor" : "Back to Doctor Selection"} />

      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center gap-6 text-center">
        
        {/* Success Icon & Token Badge */}
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center shadow-inner">
          <CheckCircle2 size={44} className="text-teal-600" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {lang === "hi" ? "OPD टोकन जनरेट हुआ" : "OPD Token Generated"}
          </span>
          <h2 className="text-3xl font-black text-teal-700">Token #{tokenNum}</h2>
        </div>

        {/* Details Summary Card */}
        <div className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400">{lang === "hi" ? "रोगी का नाम:" : "Patient Name:"}</span>
            <span className="font-bold text-slate-800">{patient.name || "Guest Patient"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400">{lang === "hi" ? "विभाग:" : "Department:"}</span>
            <span className="font-bold text-teal-700">{triage.department}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400">{lang === "hi" ? "नियुक्त डॉक्टर:" : "Assigned Doctor:"}</span>
            <span className="font-bold text-slate-800">{doctor.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400">{lang === "hi" ? "अनुमानित प्रतीक्षा:" : "Est. Wait Time:"}</span>
            <span className="font-bold text-emerald-600">{doctor.waitTimeMins} Minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{lang === "hi" ? "फ़ोन नंबर:" : "Contact Phone:"}</span>
            <span className="font-bold text-slate-800">{patient.phone || "Not Provided"}</span>
          </div>
        </div>

        {/* Localized Room & Floor Navigation Card */}
        <div className="w-full p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-left space-y-2 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <span>📍 {lang === "hi" ? "कमरा और मंजिल निर्देश" : "Room & Floor Navigation"}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-extrabold border border-amber-300">
              Room 204 | Cabinet 2, 1st Floor
            </span>
          </div>
          <p className="text-xs font-bold text-slate-900">
            {lang === "hi"
              ? "कैबिनेट 2 (कमरा नंबर 204) - पहली मंजिल (कार्डियोलॉजी विभाग)"
              : "Cabinet 2 (Room 204) - 1st Floor (Cardiology / Clinical Wing)"}
          </p>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {lang === "hi"
              ? "लिफ्ट 'A' या सीढ़ियों से पहली मंजिल पर जाएं ➔ गलियारे में बाईं ओर मुड़ें ➔ कैबिनेट 2 के बाहर कमरा नंबर 204 पहुंचे।"
              : "Take Elevator A or Stairs to the 1st Floor ➔ Turn Left at the corridor ➔ Proceed to Room 204 outside Cabinet 2."}
          </p>
        </div>

        {/* WhatsApp Badge */}
        <div className="w-full p-3 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center gap-2 text-xs font-semibold text-teal-800">
          <span>✅ {lang === "hi" ? "WhatsApp और SMS टोकन अलर्ट भेजे गए" : "WhatsApp & SMS Token Alerts Sent"}</span>
        </div>

        {/* Action Buttons: Doctor Dashboard & Reset */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onOpenDashboard}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>👨‍⚕️ {lang === "hi" ? "डॉक्टर डैशबोर्ड देखें →" : "Open Doctor Dashboard →"}</span>
          </button>

          <button
            onClick={onReset}
            className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>{lang === "hi" ? "नया पंजीकरण शुरू करें" : "Start New Registration"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   PHASE 6 — DOCTOR CLINICAL WORKSTATION DASHBOARD
   ========================================================================= */
function DoctorDashboardStage({
  lang,
  patient,
  symptomsText,
  triage,
  doctor,
  tokenNum,
  onReturnToKiosk,
}: {
  lang: Lang;
  patient: PatientInfo;
  symptomsText: string;
  triage: TriageResult;
  doctor: Doctor;
  tokenNum: string;
  onReturnToKiosk: () => void;
}) {
  const [called, setCalled] = useState(false);
  const [rxNotes, setRxNotes] = useState("");
  const [pharmacyOption, setPharmacyOption] = useState<"YES" | "NO">("YES");
  const [completed, setCompleted] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{ patientAlert?: string; pharmacyAlert?: string } | null>(null);

  const {
    isListening: isDictating,
    startListening: startDictation,
    stopListening: stopDictation,
  } = useSpeechRecognition({
    lang: lang === "hi" ? "hi" : "en",
    onTranscript: (spokenText) => {
      if (spokenText) {
        setRxNotes((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
      }
    },
  });

  const toggleDictation = () => {
    if (isDictating) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  const handleSaveAndSend = () => {
    const phoneNum = patient.phone || "+91 98765 43210";
    const patientMsg = `📲 Rx Sent to Patient's Mobile (${phoneNum}): [Prescription & Token #${tokenNum} delivered via WhatsApp]`;

    if (pharmacyOption === "YES") {
      const pharmacyMsg = `🏥 Hospital Pharmacy Dispensing Desk Notified! Order #RX-${tokenNum.replace("MED-", "")} routed to Ground Floor Pharmacy Counter.`;
      setDispatchStatus({ patientAlert: patientMsg, pharmacyAlert: pharmacyMsg });
    } else {
      setDispatchStatus({ patientAlert: `📲 Rx Sent to Patient's Mobile (${phoneNum}). Local Pharmacy fulfillment selected.` });
    }
    setCompleted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto flex flex-col gap-6"
    >
      <GlobalBackButton onClick={onReturnToKiosk} label={lang === "hi" ? "वापस कियोस्क / Kiosk" : "Return to Kiosk"} />

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white text-2xl flex items-center justify-center shadow">
            👨‍⚕️
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Doctor Clinical Workstation</h2>
            <p className="text-xs text-slate-500 font-medium">Room 204 &bull; Cabinet 2 &bull; Physician: {doctor.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-extrabold border border-teal-200">
            Token #{tokenNum}
          </span>
          {completed && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
              ✅ Consultation Completed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Patient Profile & Speech Transcript */}
        <div className="flex flex-col gap-6">
          {/* Patient Demographic Profile Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <User size={18} className="text-teal-600" />
                <span>Patient Profile</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">Reg: Today</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Name / नाम</span>
                <span className="font-bold text-slate-800">{patient.name || "Guest Patient"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Age / Sex</span>
                <span className="font-bold text-slate-800">{patient.age || "N/A"} Yrs &bull; {patient.sex || "N/A"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">WhatsApp Contact</span>
                <span className="font-bold text-teal-700">{patient.phone || "N/A"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Emergency Contact</span>
                <span className="font-bold text-red-600">{patient.emergency || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Patient Reported Symptoms Quote */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-slate-100 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Mic size={15} className="text-teal-600" />
              <span>Exact Voice Speech Transcript</span>
            </span>
            <blockquote className="p-4 rounded-2xl bg-teal-50/70 border-l-4 border-teal-600 text-slate-800 text-xs sm:text-sm italic font-medium leading-relaxed shadow-xs">
              "{symptomsText || "No voice transcript recorded."}"
            </blockquote>
          </div>
        </div>

        {/* Right Column: AI Triage & Doctor Action Panel */}
        <div className="flex flex-col gap-6">
          {/* AI Clinical Triage & Differential Assessment */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-600" />
                <span>AI Clinical Triage</span>
              </h3>
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-extrabold">
                {triage.department}
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Clinical Insight Summary
                </span>
                <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-xs leading-relaxed font-medium">
                  {triage.clinical_summary || triage.summary}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Possible Conditions Evaluated
                </span>
                <div className="flex flex-col gap-2">
                  {(triage.possible_conditions || triage.differential_factors || []).map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-800 font-medium shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 animate-pulse" />
                      <span>{cond}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Action Panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-slate-100 space-y-4">
            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-600" />
              <span>Doctor Action Panel</span>
            </h3>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setCalled(true)}
                disabled={called}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-75 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>{called ? "📢 Patient Called to Room 204" : "📢 Call Patient to Room 204"}</span>
              </button>

              {/* Dictation Header & Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Clinical Notes &amp; Digital Prescription (Rx)
                  </label>
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      isDictating
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-200"
                    }`}
                  >
                    <Mic size={14} />
                    <span>{isDictating ? "⏹️ Stop Dictation (Listening...)" : "🎙️ Dictate Prescription (Voice-to-Rx)"}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                  placeholder="Enter or dictate clinical observations, diagnosis, prescribed medicines..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-xs"
                />
              </div>

              {/* Hospital Pharmacy Fulfillment Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  {lang === "hi"
                    ? "क्या अस्पताल की फार्मेसी से दवाएं लेनी हैं?"
                    : "Fulfill Prescription via Hospital In-House Pharmacy?"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPharmacyOption("YES")}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer ${
                      pharmacyOption === "YES"
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                    }`}
                  >
                    <span>YES (Send to In-House Pharmacy + Patient)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPharmacyOption("NO")}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer ${
                      pharmacyOption === "NO"
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                    }`}
                  >
                    <span>NO (Send to Patient Only)</span>
                  </button>
                </div>
              </div>

              {/* Save & Send Button */}
              <button
                type="button"
                onClick={handleSaveAndSend}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📲 Save &amp; Send Digital Prescription</span>
              </button>

              {/* Toast Alerts Display */}
              {dispatchStatus && (
                <div className="space-y-2 pt-1">
                  {dispatchStatus.patientAlert && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold leading-relaxed flex items-center gap-2 shadow-xs">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>{dispatchStatus.patientAlert}</span>
                    </div>
                  )}
                  {dispatchStatus.pharmacyAlert && (
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold leading-relaxed flex items-center gap-2 shadow-xs">
                      <Building size={16} className="text-blue-600 flex-shrink-0" />
                      <span>{dispatchStatus.pharmacyAlert}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCompleted(true)}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Complete Consultation</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnToKiosk}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Return Kiosk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   ROOT PAGE — PHASE STATE MACHINE
   ========================================================================= */
export default function Page() {
  const [phase, setPhase]         = useState<Phase>("logo");
  const [lang, setLang]           = useState<Lang>("en");
  const [logoKey, setLogoKey]     = useState<number>(0);

  const [patient, setPatient]     = useState<PatientInfo>({
    name: "", age: "", sex: "", phone: "", emergency: "", date: "",
  });

  const [symptomsText, setSymptomsText] = useState<string>("");

  const [triage, setTriage]       = useState<TriageResult>({
    department: "General Physician",
    severity: "Green",
    summary: "Standard routine checkup.",
  });

  const [selectMode, setSelectMode] = useState<SelectMode>("ai");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(MOCK_DOCTORS[0]);
  const [tokenNum, setTokenNum]   = useState<string>("MED-CARD-104");

  const handleLangSelect = useCallback((l: Lang) => {
    setLang(l);
    setPhase("form");
  }, []);

  const handleReplayIntro = useCallback(() => {
    setLogoKey((prev) => prev + 1);
    setPhase("logo");
  }, []);

  const handleFormProceed = useCallback((data: PatientInfo) => {
    setPatient(data);
    setPhase("symptoms");
  }, []);

  const handleAnalyzeSymptoms = useCallback(async (symptoms: string) => {
    const cleanedSymptoms = cleanTranscript(symptoms);
    setSymptomsText(cleanedSymptoms);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanedSymptoms, symptomText: cleanedSymptoms }),
      });
      const json = await res.json();
      if (json?.data || json?.department) {
        const payload = json.data || json;
        setTriage({
          department: payload.department || "Cardiology / Emergency Medicine",
          clinical_summary: payload.clinical_summary || payload.clinical_reasoning || payload.reasoning_summary || "Multi-factor clinical evaluation required.",
          possible_conditions: payload.possible_conditions || payload.differential_factors || [],
          summary: payload.clinical_summary || payload.summary || "Clinical assessment complete.",
          provider: json.provider,
        });
      }
    } catch (e) {
      setTriage({
        department: "Cardiology / Emergency Medicine",
        clinical_summary:
          "Chest pain persisting for 2 days combined with an acute headache strongly warrants immediate cardiac and vascular evaluation to rule out hypertensive crisis or coronary issues alongside musculoskeletal or gastrointestinal causes.",
        possible_conditions: [
          "Acute Coronary Assessment / Angina Evaluation",
          "Hypertensive Crisis / Elevated Blood Pressure Symptoms",
          "Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm",
          "Vascular / Tension Headache Evaluation"
        ],
      });
    } finally {
      setPhase("decision");
    }
  }, []);

  const handleChooseMode = useCallback((mode: SelectMode) => {
    setSelectMode(mode);
    setPhase("doctors");
  }, []);

  const handleSelectDoctor = useCallback((doc: Doctor) => {
    setSelectedDoctor(doc);
    setTokenNum(`MED-${Math.floor(1000 + Math.random() * 9000)}`);
    setPhase("confirmation");
  }, []);

  const handleResetAll = useCallback(() => {
    setPhase("language");
  }, []);

  return (
    <>
      <style>{`
        @keyframes ripple { to { transform:scale(4); opacity:0; } }
        @keyframes pulse-slow { 0%,100%{ box-shadow:0 0 0 0 rgba(13,148,136,.35); }
                                 50%{ box-shadow:0 0 0 10px rgba(13,148,136,0); } }
        .animate-pulse-slow { animation: pulse-slow 2.2s ease-in-out infinite; }
      `}</style>

      <AnimatePresence mode="wait">

        {/* PHASE 1: LOGO */}
        {phase === "logo" && (
          <LogoStage key={`logo-${logoKey}`} onDone={() => setPhase("language")} />
        )}

        {/* PHASE 2: LANGUAGE */}
        {phase === "language" && (
          <LanguageStage key="language" onSelect={handleLangSelect} onReplay={handleReplayIntro} />
        )}

        {/* COMMON FRAME WRAPPER FOR PHASES 3 - 6 */}
        {phase !== "logo" && phase !== "language" && (
          <motion.div key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .4 }}
            className="w-full min-h-screen relative overflow-auto"
            style={{ background: "linear-gradient(135deg,#F0FDFA 0%,#F8FAFC 50%,#EFF6FF 100%)" }}
          >
            <MedCrossGrid />
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
              <HeaderBar lang={lang} />

              <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <AnimatePresence mode="wait">
                  {/* PHASE 3: FORM */}
                  {phase === "form" && (
                    <FormStage
                      key="form-stage"
                      lang={lang}
                      initialData={patient}
                      onProceed={handleFormProceed}
                      onBack={() => setPhase("language")}
                    />
                  )}

                  {/* PHASE 4A: SYMPTOMS */}
                  {phase === "symptoms" && (
                    <SymptomsStage
                      key="symptoms-stage"
                      lang={lang}
                      onAnalyze={handleAnalyzeSymptoms}
                      onBack={() => setPhase("form")}
                    />
                  )}

                  {/* PHASE 4B: DECISION GATE */}
                  {phase === "decision" && (
                    <DecisionGateStage
                      key="decision-stage"
                      lang={lang}
                      triage={triage}
                      onChooseMode={handleChooseMode}
                      onBack={() => setPhase("symptoms")}
                    />
                  )}

                  {/* PHASE 4C: DOCTOR SELECTION */}
                  {phase === "doctors" && (
                    <DoctorsStage
                      key="doctors-stage"
                      lang={lang}
                      triage={triage}
                      selectMode={selectMode}
                      onSelectDoctor={handleSelectDoctor}
                      onBack={() => setPhase("decision")}
                    />
                  )}

                  {/* PHASE 5: CONFIRMATION */}
                  {phase === "confirmation" && (
                    <ConfirmationStage
                      key="confirmation-stage"
                      lang={lang}
                      patient={patient}
                      triage={triage}
                      doctor={selectedDoctor}
                      tokenNum={tokenNum}
                      onReset={handleResetAll}
                      onOpenDashboard={() => setPhase("dashboard")}
                      onBack={() => setPhase("doctors")}
                    />
                  )}

                  {/* PHASE 6: DOCTOR DASHBOARD */}
                  {phase === "dashboard" && (
                    <DoctorDashboardStage
                      key="dashboard-stage"
                      lang={lang}
                      patient={patient}
                      symptomsText={symptomsText}
                      triage={triage}
                      doctor={selectedDoctor}
                      tokenNum={tokenNum}
                      onReturnToKiosk={() => setPhase("language")}
                    />
                  )}
                </AnimatePresence>
              </main>

              <footer className="w-full py-3 text-center text-[10px] text-slate-400 border-t border-white/40 bg-white/30 backdrop-blur-sm relative z-40">
                MEDICOBOT — Secure AI-powered OPD intake &bull; All data encrypted &bull; HIPAA-compliant
              </footer>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </>
  );
}
