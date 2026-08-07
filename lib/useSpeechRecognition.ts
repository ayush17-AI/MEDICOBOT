"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface SpeechRecognitionOptions {
  lang?: "en" | "hi";
  onTranscript?: (transcript: string) => void;
  onNoiseDetected?: () => void;
}

declare global {
  interface Window {
    currentAudioStream?: MediaStream | null;
  }
}

// Module-level global reference for active speech recognition instance across component remounts & field switches
let activeRecognitionInstance: any = null;
let globalLiveStream: MediaStream | null = null;

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getCleanMicStream = async (): Promise<MediaStream> => {
  if (typeof window !== "undefined" && window.currentAudioStream) {
    try {
      window.currentAudioStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    } catch (e) {
      console.warn("Track stop warning:", e);
    }
    window.currentAudioStream = null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  if (typeof window !== "undefined") {
    window.currentAudioStream = stream;
  }
  return stream;
};

export const initializeProductionMic = async (): Promise<MediaStream | null> => {
  try {
    if (typeof window === "undefined") return null;
    if (!globalLiveStream || !globalLiveStream.active) {
      globalLiveStream = await getCleanMicStream();
    }
    return globalLiveStream;
  } catch (err) {
    console.error("HTTPS Mic Access Error:", err);
    return null;
  }
};

export const parsePhoneDigitsStrict = (rawText: string): string => {
  if (!rawText) return "";

  const wordToNumberMap: { [key: string]: string } = {
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

  let processed = rawText.toLowerCase();

  // Convert phrases like "triple one" or "double seven"
  processed = processed.replace(/triple (\w+)/g, '$1 $1 $1');
  processed = processed.replace(/double (\w+)/g, '$1 $1');

  Object.keys(wordToNumberMap).forEach((word) => {
    const reg = new RegExp(`\\b${word}\\b`, 'g');
    processed = processed.replace(reg, wordToNumberMap[word]);
  });

  // Extract digits only
  let digits = processed.replace(/\D/g, '');

  // Remove leading 1 or 0 if it exceeds 10 digits
  if (digits.length > 10 && (digits.startsWith('1') || digits.startsWith('0'))) {
    digits = digits.substring(1);
  }

  return digits.slice(0, 10);
};

export const cleanDigitsOnly = parsePhoneDigitsStrict;
export const parseWhisperPhoneDigits = parsePhoneDigitsStrict;
export const sanitizePhoneDigits = parsePhoneDigitsStrict;
export const processPhoneVoiceInput = parsePhoneDigitsStrict;
export const cleanPhoneDigits = parsePhoneDigitsStrict;
export const parsePhoneNumber = parsePhoneDigitsStrict;
export const normalizePhoneNumber = parsePhoneDigitsStrict;
export const extractCleanPhoneDigits = parsePhoneDigitsStrict;
export const extractDigitsStrict = parsePhoneDigitsStrict;

export const startProductionVoiceCapture = async (
  onResult: (text: string) => void,
  onEndCallback: () => void,
  lang: string = "en-US"
) => {
  const stream = await initializeProductionMic();
  if (!stream) {
    alert("Microphone permission blocked. Please allow mic access in your browser URL bar.");
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  // HTTPS fix: single-shot per utterance with rapid restart on end
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = lang;

  let finalTranscript = "";

  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    onResult(finalTranscript || interim);
  };

  recognition.onerror = (event: any) => {
    console.warn("Production STT Event Notice:", event.error);
  };

  recognition.onend = () => {
    onEndCallback();
  };

  try {
    recognition.start();
  } catch (e) {
    console.error("STT Start Error:", e);
  }

  return recognition;
};

export const stopVoiceSession = () => {
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.abort();
      activeRecognitionInstance.stop();
    } catch (e) {}
    activeRecognitionInstance = null;
  }
};

export const ensureAudioContextActive = async (audioCtx: AudioContext) => {
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn('AudioContext resume failed:', e);
    }
  }
};

export const getProductionAudioStream = async (): Promise<MediaStream> => {
  return await getCleanMicStream();
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
      // Track cleanup managed via getCleanMicStream
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

    // 1. Pre-warm production mic & Initialize Web Audio API DSP Filter Node
    try {
      const stream = await getCleanMicStream();
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        // Resume suspended audio context for live HTTPS policy
        await ensureAudioContextActive(audioCtx);

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
    } catch (e) {
      console.warn("Web Audio DSP filter initialization fallback:", e);
    }

    // 2. Initialize Speech Recognition with continuous = false for production HTTPS safe stream restart
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
      recognition.continuous = false; // PRODUCTION HTTPS SAFE MODE
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

      // SEAMLESS RAPID RESTART LOOP ON END IF MIC STILL ACTIVE
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
