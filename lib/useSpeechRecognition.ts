"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface SpeechRecognitionOptions {
  lang?: "en" | "hi";
  onTranscript?: (transcript: string) => void;
  onNoiseDetected?: () => void;
}

// Module-level global reference for active speech recognition instance across component remounts & field switches
let activeRecognitionInstance: any = null;

export const stopVoiceSession = () => {
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.abort();
      activeRecognitionInstance.stop();
    } catch (e) {}
    activeRecognitionInstance = null;
  }
};

export function cleanTranscript(text: string): string {
  if (!text) return "";
  // Strip filler words & background speech artifacts
  const fillers = /\b(uh+|um+|ah+|er+|like|you know|hmmm+|haa+|accha+|matlab+)\b/gi;
  let cleaned = text.replace(fillers, " ");
  // Remove word duplicates (e.g., "I I I am am")
  cleaned = cleaned.replace(/\b(\w+)( \1\b)+/gi, "$1");
  // Remove phrase loops (e.g., "chest pain chest pain")
  cleaned = cleaned.replace(/(.{4,})( \1)+/gi, "$1");
  // Remove multi-spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

export const sanitizePhoneDigits = (rawSpeech: string): string => {
  if (!rawSpeech) return "";

  const wordMap: { [key: string]: string } = {
    'zero': '0', 'oh': '0', 'shunya': '0', 'जीरो': '0', 'शून्य': '0',
    'one': '1', 'won': '1', 'ek': '1', 'एक': '1',
    'two': '2', 'to': '2', 'too': '2', 'do': '2', 'दो': '2',
    'three': '3', 'tree': '3', 'teen': '3', 'तीन': '3',
    'four': '4', 'for': '4', 'fore': '4', 'chaar': '4', 'चार': '4',
    'five': '5', 'paanch': '5', 'panch': '5', 'पाँच': '5',
    'six': '6', 'cheh': '6', 'छह': '6',
    'seven': '7', 'saat': '7', 'सात': '7',
    'eight': '8', 'ate': '8', 'aath': '8', 'आठ': '8',
    'nine': '9', 'nein': '9', 'nau': '9', 'नौ': '9'
  };

  let str = rawSpeech.toLowerCase();

  // Replace spoken word digits
  Object.keys(wordMap).forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    str = str.replace(regex, wordMap[word]);
  });

  // Keep ONLY numeric digits
  let digitsOnly = str.replace(/\D/g, '');

  // Strip ghost leading '1' or '0' if digits exceed 10 or start incorrectly
  if (digitsOnly.length > 10 && digitsOnly.startsWith('1')) {
    digitsOnly = digitsOnly.substring(1);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.substring(1);
  }

  return digitsOnly.slice(0, 10);
};

export const processPhoneVoiceInput = sanitizePhoneDigits;
export const cleanPhoneDigits = sanitizePhoneDigits;
export const parsePhoneNumber = sanitizePhoneDigits;
export const normalizePhoneNumber = sanitizePhoneDigits;

export const cleanGenderInput = (rawTranscript: string): "Male" | "Female" | "Intersex" | "Other" => {
  const txt = rawTranscript.toLowerCase().trim();

  if (
    txt.includes("female") ||
    txt.includes("woman") ||
    txt.includes("girl") ||
    txt.includes("mahila") ||
    txt.includes("aurat") ||
    txt.includes("महिला") ||
    txt.includes("स्त्री")
  ) {
    return "Female";
  }

  if (
    txt.includes("male") ||
    txt.includes("man") ||
    txt.includes("boy") ||
    txt.includes("purush") ||
    txt.includes("aadmi") ||
    txt.includes("पुरुष")
  ) {
    return "Male";
  }

  if (txt.includes("intersex")) return "Intersex";
  if (txt.includes("trans") || txt.includes("other") || txt.includes("अन्य")) return "Other";

  return "Male";
};

export const parseSexInput = cleanGenderInput;

export function useSpeechRecognition({
  lang = "en",
  onTranscript,
  onNoiseDetected,
}: SpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [noiseAlert, setNoiseAlert]   = useState(false);

  const recognitionRef  = useRef<any>(null);
  const isListeningRef  = useRef<boolean>(false);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const mediaStreamRef  = useRef<MediaStream | null>(null);

  // Keep isListeningRef in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Stop listening & cleanup audio nodes (ONLY on explicit manual toggle off or session reset)
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    stopVoiceSession();
    if (recognitionRef.current) {
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start continuous listening with 85Hz High-Pass & 3400Hz Low-Pass Audio DSP + Instant Re-Trigger Session Reset
  const startListening = useCallback(async () => {
    setNoiseAlert(false);
    if (typeof window === "undefined") return;

    // FORCE KILL ANY STALE / PREVIOUS VOICE SESSION INSTANCE FIRST
    stopVoiceSession();

    // Set persistent state lock
    isListeningRef.current = true;
    setIsListening(true);

    // 1. Initialize Web Audio API DSP Filter Node (85Hz High-Pass & 3400Hz Low-Pass)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);

          // Low-cut filter to eliminate background rumble (85Hz)
          const highPass = audioCtx.createBiquadFilter();
          highPass.type = "highpass";
          highPass.frequency.setValueAtTime(85, audioCtx.currentTime);

          // High-cut filter to attenuate high-frequency chatter (3400Hz)
          const lowPass = audioCtx.createBiquadFilter();
          lowPass.type = "lowpass";
          lowPass.frequency.setValueAtTime(3400, audioCtx.currentTime);

          source.connect(highPass);
          highPass.connect(lowPass);
        }
      }
    } catch (e) {
      console.warn("Web Audio DSP filter initialization fallback:", e);
    }

    // 2. Initialize Speech Recognition with continuous = true
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please type text manually.");
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      activeRecognitionInstance = recognition;
      recognition.continuous = true; // PERSISTENT CONTINUOUS LISTENING
      recognition.interimResults = true;
      recognition.lang = lang === "hi" ? "hi-IN" : "en-US";

      recognition.onresult = (event: any) => {
        let currentCombined = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const confidence = res[0]?.confidence ?? 1;

          // CONFIDENCE GATE: Ignore audio input with confidence < 0.75
          if (confidence < 0.75 && confidence > 0) {
            setNoiseAlert(true);
            if (onNoiseDetected) onNoiseDetected();
            continue;
          }

          const raw = res[0]?.transcript;
          if (raw) {
            currentCombined += raw + " ";
          }
        }

        if (currentCombined) {
          const cleaned = cleanTranscript(currentCombined);
          if (cleaned) {
            // SET CLEANED RESULT DIRECTLY (PREVENTS INTERIM SELF-CONCATENATION LOOPS)
            setTranscript(cleaned);
            if (onTranscript) onTranscript(cleaned);
            setNoiseAlert(false);
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e?.error);
        if (e?.error === "no-speech" || e?.error === "network") {
          if (isListeningRef.current) {
            try {
              recognition.stop();
              recognition.start(); // Instant auto-recovery
            } catch (err) {}
          }
        }
      };

      // AGGRESSIVE AUTO-RESTART KEEP-ALIVE LOOP
      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (err) {
            setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log("Speech recognition keep-alive restart retry");
                }
              }
            }, 100);
          }
        }
      };

      recognition.start();
    } catch (e) {
      console.warn("Error starting speech recognition:", e);
      if (!isListeningRef.current) {
        stopListening();
      }
    }
  }, [lang, stopListening, onTranscript, onNoiseDetected]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    transcript,
    setTranscript,
    noiseAlert,
    startListening,
    stopListening,
  };
}
