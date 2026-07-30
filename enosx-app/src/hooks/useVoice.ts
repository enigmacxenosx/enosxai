import { useState, useCallback, useRef } from "react";
import { VoiceState } from "@/lib/types";

const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY || "";

interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function useVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // Don't set to idle here, let onend handle it
    }
  }, []);

  const startListening = useCallback(
    (onFinalResult?: (text: string) => void, language: string = "en-US") => {
      if (!isSupported) return;

      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition: ISpeechRecognition = new SpeechRecognitionAPI();
      recognition.continuous = true; 
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState("listening");
        setTranscript("");
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let currentFullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentFullTranscript += event.results[i][0].transcript;
        }
        
        // Immediate update for the transcript state
        setTranscript(currentFullTranscript);

        // If the last result is final, we can optionally trigger the callback
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal && onFinalResult) {
          onFinalResult(currentFullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setVoiceState("idle");
      };

      recognition.onend = () => {
        setVoiceState("idle");
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [isSupported]
  );

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setVoiceState("idle");
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!ELEVEN_LABS_API_KEY || !text) return;

      try {
        setVoiceState("speaking");
        const cleanText = text
          .replace(/!\[.*\]\(.*\)/g, "")
          .replace(/\[.*\]\(.*\)/g, "")
          .replace(/[*_#`]/g, "")
          .trim();

        if (!cleanText) {
          setVoiceState("idle");
          return;
        }

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnNLMSvx`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVEN_LABS_API_KEY,
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: cleanText,
              model_id: "eleven_flash_v2_5",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (!response.ok) throw new Error("TTS failed");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setVoiceState("idle");
          audioRef.current = null;
        };

        await audio.play();
      } catch (error) {
        console.error("Speech error", error);
        setVoiceState("idle");
      }
    },
    []
  );

  const setLanguage = useCallback((lang: string) => {
    // This is just a placeholder if needed by other components
    console.log("Setting voice language to:", lang);
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
  };
}
