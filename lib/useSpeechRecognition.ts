"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface SpeechRecognitionOptions {
  lang?: "en" | "hi";
  onTranscript?: (transcript: string) => void;
  onNoiseDetected?: () => void;
}

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

export const parsePhoneNumber = (rawTranscript: string): string => {
  if (!rawTranscript) return "";

  // Map word numbers to single digits
  const wordToDigit: { [key: string]: string } = {
    'zero': '0', 'oh': '0', 'nought': '0', 'one': '1', 'won': '1',
    'two': '2', 'to': '2', 'too': '2', 'three': '3', 'tree': '3',
    'four': '4', 'for': '4', 'fore': '4', 'five': '5', 'six': '6',
    'seven': '7', 'eight': '8', 'ate': '8', 'nine': '9', 'nein': '9',
    'ek': '1', 'do': '2', 'teen': '3', 'chaar': '4', 'paanch': '5',
    'panch': '5', 'cheh': '6', 'saat': '7', 'aath': '8', 'nau': '9',
    'शून्य': '0', 'जीरो': '0', 'एक': '1', 'दो': '2', 'तीन': '3',
    'चार': '4', 'पाँच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9'
  };

  let cleaned = rawTranscript.toLowerCase();

  // Replace word numbers
  Object.keys(wordToDigit).forEach((word) => {
    const reg = new RegExp(`\\b${word}\\b`, 'g');
    cleaned = cleaned.replace(reg, wordToDigit[word]);
  });

  // Extract digits ONLY
  const digits = cleaned.replace(/\D/g, '');

  // Strip accidental leading country code '1' if length exceeds 10
  let finalDigits = digits;
  if (finalDigits.length > 10 && finalDigits.startsWith('1')) {
    finalDigits = finalDigits.substring(1);
  }

  return finalDigits.slice(0, 10);
};

export const normalizePhoneNumber = parsePhoneNumber;

export const parseSexInput = (rawTranscript: string): "Male" | "Female" | "Other" => {
  const text = rawTranscript.toLowerCase().trim();

  // Explicit female keywords (check female first so "female" doesn't trigger "male")
  if (
    text.includes("female") ||
    text.includes("woman") ||
    text.includes("girl") ||
    text.includes("mahila") ||
    text.includes("aurat") ||
    text.includes("महिला") ||
    text.includes("स्त्री")
  ) {
    return "Female";
  }

  // Explicit male keywords
  if (
    text.includes("male") ||
    text.includes("man") ||
    text.includes("boy") ||
    text.includes("purush") ||
    text.includes("aadmi") ||
    text.includes("पुरुष")
  ) {
    return "Male";
  }

  // Explicit intersex / trans / other keyword
  if (
    text.includes("intersex") ||
    text.includes("trans") ||
    text.includes("other") ||
    text.includes("अन्य")
  ) {
    return "Other";
  }

  // Default fallback if unclear
  return "Male";
};

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

  // Stop listening & cleanup audio nodes (ONLY on explicit manual toggle off)
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
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

  // Start continuous listening with 85Hz High-Pass & 3400Hz Low-Pass Audio DSP + Permanent Keep-Alive
  const startListening = useCallback(async () => {
    setNoiseAlert(false);
    if (typeof window === "undefined") return;

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
      recognition.continuous = true; // PERSISTENT CONTINUOUS LISTENING
      recognition.interimResults = true;
      recognition.lang = lang === "hi" ? "hi-IN" : "en-US";

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
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
            fullTranscript += raw + " ";
          }
        }

        if (fullTranscript) {
          const cleaned = cleanTranscript(fullTranscript);
          if (cleaned) {
            setTranscript((prev) => {
              const combined = prev ? `${prev} ${cleaned}` : cleaned;
              const normalized = cleanTranscript(combined);
              if (onTranscript) onTranscript(normalized);
              return normalized;
            });
            setNoiseAlert(false);
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e?.error);
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
