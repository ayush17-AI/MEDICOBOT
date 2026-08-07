"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./types";

/* Minimal ambient typings for the (still non-standard) Web Speech API —
 * TS's lib.dom does not ship these. */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

const CONFIDENCE_THRESHOLD = 0.75;
const SILENCE_DEBOUNCE_MS = 2500;

// Common filler words stripped from the final transcript before it's used.
const FILLER_WORDS = /\b(um+|uh+|erm+|like|you know|matlab|actually|haan|toh)\b/gi;

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Noise-filtered voice input: rejects low-confidence transcripts (<0.75),
 * debounces on 2.5s of silence, and strips common filler words.
 */
export function useSpeechToText(lang: Lang) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSupported(getRecognitionCtor() !== null);
  }, []);

  const startListening = useCallback(
    (onFinalTranscript: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setLastError("Speech recognition is not supported in this browser.");
        return;
      }
      const recognition = new Ctor();
      recognition.lang = lang === "hi" ? "hi-IN" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      const clearSilenceTimer = () => {
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
          silenceTimer.current = null;
        }
      };

      const armSilenceTimer = () => {
        clearSilenceTimer();
        silenceTimer.current = setTimeout(() => {
          recognition.stop();
        }, SILENCE_DEBOUNCE_MS);
      };

      recognition.onresult = (e) => {
        armSilenceTimer();
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (!result.isFinal) continue;
          const { transcript, confidence } = result[0];
          // Confidence gate: silently drop low-confidence/noisy transcripts.
          if (confidence !== undefined && confidence < CONFIDENCE_THRESHOLD) continue;
          const cleaned = transcript.replace(FILLER_WORDS, "").replace(/\s+/g, " ").trim();
          if (cleaned) onFinalTranscript(cleaned);
        }
      };
      recognition.onerror = () => setLastError("Microphone error — please try again.");
      recognition.onend = () => {
        clearSilenceTimer();
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setLastError(null);
      setIsListening(true);
      armSilenceTimer();
      recognition.start();
    },
    [lang]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, lastError, startListening, stopListening };
}

/** Bilingual text-to-speech for reading instructions aloud. */
export function useSpeak() {
  return useCallback((text: string, lang: Lang) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);
}
