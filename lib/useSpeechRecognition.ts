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
  return cleaned;
}

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

  // Keep isListeningRef in sync for auto-restart onend loop
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

  // Start continuous listening with 150Hz High-Pass Audio DSP & Confidence Gate
  const startListening = useCallback(async () => {
    setNoiseAlert(false);
    if (typeof window === "undefined") return;

    // 1. Initialize Web Audio API DSP Filter Node (150Hz High-Pass)
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
          const highPassFilter = audioCtx.createBiquadFilter();
          highPassFilter.type = "highpass";
          highPassFilter.frequency.setValueAtTime(150, audioCtx.currentTime);

          source.connect(highPassFilter);
        }
      }
    } catch (e) {
      console.warn("Web Audio DSP filter initialization fallback:", e);
    }

    // 2. Initialize Speech Recognition with continuous = true
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please type text manually.");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.continuous = true; // PERSISTENT CONTINUOUS LISTENING
      recognition.interimResults = true;
      recognition.lang = lang === "hi" ? "hi-IN" : "en-US";

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];

          // PROCESS FINAL RESULTS ONLY TO ELIMINATE INTERIM STUTTER LOOPS
          if (!res.isFinal) continue;

          const confidence = res[0]?.confidence ?? 1;

          // CONFIDENCE GATE: Ignore audio input with confidence < 0.75
          if (confidence < 0.75 && confidence > 0) {
            setNoiseAlert(true);
            if (onNoiseDetected) onNoiseDetected();
            continue;
          }

          const raw = res[0]?.transcript;
          if (raw) {
            const cleaned = cleanTranscript(raw);
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
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e?.error);
      };

      // AUTO-RESTART LOOP: Keep listening continuously until user manually turns mic off
      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (err) {
            console.log("Re-initiating speech recognition loop...");
          }
        }
      };

      recognition.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch (e) {
      stopListening();
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
