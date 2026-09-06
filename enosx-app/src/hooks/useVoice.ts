import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { VoiceState } from "@/lib/types";

const VOICE_SERVICE_URL = "/api/voice";

/** Voice settings stored in localStorage (enosx_voice_settings). */
export interface SpeechSettings {
  rate: number;
  pitch: number;
  /** Auto re-listen after the assistant finishes speaking. */
  continuousConversation: boolean;
  /** Start listening when the wake phrase is heard while the app is open. */
  wakePhrase: boolean;
}

const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  rate: 1,
  pitch: 1,
  continuousConversation: false,
  wakePhrase: false,
};

const WAKE_TRIGGER_WORDS = ["enosx", "ennox"];

export function loadSpeechSettings(): SpeechSettings {
  try {
    const raw = localStorage.getItem("enosx_voice_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        rate: Math.min(2, Math.max(0.5, Number(parsed.rate) || 1)),
        pitch: Math.min(2, Math.max(0, Number(parsed.pitch) || 1)),
        continuousConversation: Boolean(parsed.continuousConversation),
        wakePhrase: Boolean(parsed.wakePhrase),
      };
    }
  } catch (error) {
    console.error("Failed to load speech settings", error);
  }
  return { ...DEFAULT_SPEECH_SETTINGS };
}

export function saveSpeechSettings(settings: SpeechSettings) {
  try {
    localStorage.setItem("enosx_voice_settings", JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save speech settings", error);
  }
}

interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

function cleanSpeechText(text: string) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSpeechChunks(text: string, maximumLength = 220) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (
      currentChunk &&
      `${currentChunk} ${trimmedSentence}`.length > maximumLength
    ) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    if (trimmedSentence.length <= maximumLength) {
      currentChunk = currentChunk
        ? `${currentChunk} ${trimmedSentence}`
        : trimmedSentence;
      continue;
    }

    const words = trimmedSentence.split(/\s+/);
    for (const word of words) {
      if (currentChunk && `${currentChunk} ${word}`.length > maximumLength) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function getRecognitionErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow the microphone in your browser settings, then try again.";
    case "no-speech":
      return "No speech was detected. Please try again and speak a little closer to your microphone.";
    case "audio-capture":
      return "No microphone was found. Check that a microphone is connected and available.";
    case "network":
      return "Speech recognition needs an internet connection. Check your connection and try again.";
    case "language-not-supported":
      return "The selected speech-recognition language is not supported by this browser.";
    default:
      return "Voice input could not start. Please try again.";
  }
}

export function useVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [settings, setSettings] = useState<SpeechSettings>(() => loadSpeechSettings());
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const languageRef = useRef("en-US");
  const settingsRef = useRef<SpeechSettings>(settings);
  const onFinalResultRef = useRef<((text: string) => void) | undefined>(undefined);
  const listenAgainTimerRef = useRef<number | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Persist settings whenever they change
  useEffect(() => {
    saveSpeechSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<SpeechSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const objectUrl = audio.src;
    audio.pause();
    audio.src = "";
    audioRef.current = null;
    if (objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
  }, []);

  const stopSpeaking = useCallback(() => {
    releaseAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceState("idle");
  }, [releaseAudio]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch {
      recognitionRef.current = null;
      setVoiceState("idle");
    }
  }, []);

  const startListening = useCallback(
    async (onFinalResult?: (text: string) => void, requestedLanguage?: string) => {
      const language = requestedLanguage || languageRef.current;

      if (!isSupported) {
        toast.error(
          "Voice input is not supported in this browser. Please use the latest Chrome or Edge."
        );
        return;
      }

      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        toast.error("Voice input requires a secure HTTPS connection.");
        return;
      }

      stopListening();

      try {
        // Request permission explicitly so a blocked or missing microphone produces a useful error.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        const message =
          name === "NotAllowedError" || name === "SecurityError"
            ? "Microphone access is blocked. Allow the microphone in your browser settings, then try again."
            : name === "NotFoundError"
              ? "No microphone was found. Check that a microphone is connected and available."
              : "We could not access your microphone. Check your browser permission and try again.";
        toast.error(message);
        setVoiceState("idle");
        return;
      }

      const SpeechRecognitionAPI =
        (window as typeof window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).SpeechRecognition ||
        (window as typeof window & {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).webkitSpeechRecognition;

      if (!SpeechRecognitionAPI) {
        toast.error("Voice input is not available in this browser.");
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        setVoiceState("listening");
        setTranscript("");
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        if (recognitionRef.current !== recognition) return;

        let finalTranscript = "";
        let interimTranscript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const fullTranscript = `${finalTranscript}${interimTranscript}`.trim();
        setTranscript(fullTranscript);

        // Wake-phrase detection: start capturing once the wake word is heard.
        const currentSettings = settingsRef.current;
        if (currentSettings.wakePhrase && onFinalResult) {
          const lower = fullTranscript.toLowerCase();
          if (WAKE_TRIGGER_WORDS.some((word) => lower.includes(word))) {
            const afterWake = fullTranscript.slice(
              lower.length - fullTranscript.length
            );
            if (finalTranscript.trim()) {
              onFinalResult(finalTranscript.trim());
            } else if (afterWake.trim()) {
              onFinalResult(afterWake.trim());
            }
            return;
          }
        }

        if (event.results[event.results.length - 1]?.isFinal && onFinalResult && finalTranscript.trim()) {
          onFinalResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setVoiceState("idle");
        toast.error(getRecognitionErrorMessage(event.error));
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setVoiceState("idle");
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (error) {
        recognitionRef.current = null;
        setVoiceState("idle");
        console.error("Speech recognition could not start", error);
        toast.error("Voice input could not start. Please try again.");
      }
    },
    [isSupported, stopListening]
  );

  /**
   * Continuous-conversation mode: after the assistant finishes speaking,
   * automatically start listening again. Uses a small delay so the browser
   * has released the audio device before re-requesting microphone access.
   */
  const scheduleListenAgain = useCallback(
    (onFinalResult: (text: string) => void) => {
      const active = settingsRef.current.continuousConversation;
      if (listenAgainTimerRef.current !== null) {
        window.clearTimeout(listenAgainTimerRef.current);
        listenAgainTimerRef.current = null;
      }
      if (!active) return;
      listenAgainTimerRef.current = window.setTimeout(() => {
        listenAgainTimerRef.current = null;
        // Only continue while the settings still request it.
        if (settingsRef.current.continuousConversation) {
          startListening(onFinalResult);
        }
      }, 900);
    },
    [startListening]
  );

  const speak = useCallback(
    async (text: string) => {
      const cleanText = cleanSpeechText(text);
      if (!cleanText) return;

      stopSpeaking();

      const speakWithBrowser = () => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          throw new Error("Speech synthesis is not supported in this browser.");
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = languageRef.current;
        utterance.rate = settingsRef.current.rate;
        utterance.pitch = settingsRef.current.pitch;
        utterance.onend = () => {
          setVoiceState("idle");
          scheduleListenAgain(onFinalResultRef.current ?? (() => {}));
        };
        utterance.onerror = () => {
          setVoiceState("idle");
          toast.error("The ENOSX voice could not be played by this browser.");
        };
        setVoiceState("speaking");
        window.speechSynthesis.speak(utterance);
      };

      try {
        setVoiceState("speaking");
        const response = await fetch(VOICE_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "audio/wav" },
          body: JSON.stringify({ text: cleanText }),
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail.error || `Voice service failed with ${response.status}`);
        }
        const audioBlob = await response.blob();
        if (!audioBlob.size) throw new Error("Voice service returned empty audio.");
        const objectUrl = URL.createObjectURL(
          audioBlob.type ? audioBlob : new Blob([audioBlob], { type: "audio/wav" })
        );
        const audio = new Audio(objectUrl);
        audio.preload = "auto";
        audioRef.current = audio;
        audio.onended = () => {
          if (audioRef.current !== audio) return;
          releaseAudio();
          setVoiceState("idle");
          scheduleListenAgain(onFinalResultRef.current ?? (() => {}));
        };
        audio.onerror = () => {
          if (audioRef.current !== audio) return;
          releaseAudio();
          setVoiceState("idle");
          toast.error("The ENOSX voice service could not play this response.");
        };
        await audio.play();
      } catch (error) {
        console.error("ENOSX voice service failed", error);
        releaseAudio();
        try {
          // Keep voice available when server TTS is unavailable or delayed audio autoplay is rejected.
          speakWithBrowser();
        } catch (fallbackError) {
          console.error("Browser speech fallback failed", fallbackError);
          setVoiceState("idle");
          toast.error("ENOSX voice is unavailable. Check your browser audio settings.");
        }
      }
    },
    [releaseAudio, scheduleListenAgain, stopSpeaking]
  );

  const setLanguage = useCallback((language: string) => {
    languageRef.current = language || "en-US";
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
    settings,
    updateSettings,
    scheduleListenAgain,
    onFinalResultRef,
  };
}
