import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceState } from "@/lib/types";

// ── ElevenLabs Configuration ──────────────────────────────────────────────────────
// API key from environment variable (fallback to hardcoded for dev)
const ELEVEN_LABS_API_KEY =
  import.meta.env.VITE_ELEVENLABS_API_KEY ||
  "sk_afff988b841020a61ac6f97e2e7cd7d5454bb8501d81a810";

// Best voices that sound like GPT-4o / Gemini — natural, clear, professional
// "Jessica" (female) — warm, natural, GPT-like quality
// "Charlie" (male) — clear, professional, Gemini-like quality
const VOICES = {
  female: "EXAVITQu4vr4xnSDxMaL",  // Laura (updated, natural, warm)
  male: "VR6AewLTigWG4xSOukaG",     // Charlie (clear, professional)
} as const;

// Primary voice — sounds like GPT-4o / Gemini quality
const DEFAULT_VOICE_ID = VOICES.female;

// Available voice presets for user selection
export const VOICE_PRESETS = {
  female: { id: VOICES.female, name: "Laura (Female — Natural & Warm)" },
  male:   { id: VOICES.male,   name: "Charlie (Male — Clear & Professional)" },
};

// ── Web Speech API type declarations ────────────────────────────────────────────
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

// ── Markdown → Plain Text for TTS ────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "code block")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/>\s/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export function useVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element for ElevenLabs playback
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setVoiceState("idle");
    };
    audioRef.current.onerror = () => {
      console.error("[useVoice] Audio playback error, falling back to Web Speech API");
      setVoiceState("idle");
    };

    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(
    (onResult: (text: string) => void, language: string = "en-US") => {
      if (!isSupported) return;

      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition: ISpeechRecognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState("listening");
        setTranscript("");
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          onResult(finalTranscript.trim());
          setVoiceState("processing");
        }
      };

      recognition.onerror = () => {
        setVoiceState("idle");
        setTranscript("");
      };

      recognition.onend = () => {
        setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [isSupported]
  );

  const setLanguage = useCallback((lang: string) => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState("idle");
  }, []);

  // ── Speak with ElevenLabs (upgraded to v3 / Flash v2.5) ────────────────────────
  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    const cleanText = stripMarkdown(text);

    if (!cleanText) {
      onEnd?.();
      return;
    }

    // ElevenLabs has a ~5000 char limit for v3; chunk if needed
    const MAX_CHARS = 4500;

    if (cleanText.length <= MAX_CHARS) {
      await speakChunk(cleanText, onEnd);
    } else {
      // Split into sentences and speak sequentially
      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      let chunks: string[] = [];
      let currentChunk = "";

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > MAX_CHARS) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());

      for (let i = 0; i < chunks.length; i++) {
        await speakChunk(chunks[i], i === chunks.length - 1 ? onEnd : undefined);
      }
    }
  }, []);

  const speakChunk = useCallback(
    async (text: string, onEnd?: () => void) => {
      setVoiceState("speaking");

      try {
        // Use Eleven v3 model — the most natural, emotionally rich model
        // This is the same quality tier that powers GPT-4o voice and Gemini voices
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVEN_LABS_API_KEY,
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: text,
              model_id: "eleven_v3", // Most natural, emotionally rich — GPT/Gemini quality tier
              voice_settings: {
                stability: 0.4,
                similarity_boost: 0.8,
                style: 0.3,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.onended = () => {
            setVoiceState("idle");
            onEnd?.();
            URL.revokeObjectURL(url);
          };
          await audioRef.current.play();
        }
      } catch (error) {
        console.error("[useVoice] ElevenLabs Error:", error);
        setVoiceState("idle");
        onEnd?.();

        // ── Fallback: Web Speech API (use the most natural system voice) ──────────
        try {
          const synth = window.speechSynthesis;
          const utterance = new SpeechSynthesisUtterance(text);

          // Pick the best available system voice
          const voices = synth.getVoices();
          const preferredVoice =
            voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];
          if (preferredVoice) utterance.voice = preferredVoice;

          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.onend = () => {
            setVoiceState("idle");
            onEnd?.();
          };
          utterance.onerror = () => {
            setVoiceState("idle");
            onEnd?.();
          };

          synth.cancel();
          synth.speak(utterance);
        } catch {
          onEnd?.();
        }
      }
    },
    [selectedVoiceId]
  );

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setVoiceState("idle");
  }, []);

  const selectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
  }, []);

  return {
    voiceState,
    transcript,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setLanguage,
    selectVoice,
    selectedVoiceId,
  };
}
