import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { VoiceState } from "@/lib/types";

const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY || "";
const ELEVEN_LABS_VOICE_ID = "EXAVITQu4vr4xnNLMSvx";

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
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const browserUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const languageRef = useRef("en-US");

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
    browserUtteranceRef.current = null;

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

  const speakWithBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve, reject) => {
        if (!("speechSynthesis" in window)) {
          reject(new Error("Browser speech synthesis is unavailable"));
          return;
        }

        const chunks = splitIntoSpeechChunks(text);
        if (!chunks.length) {
          resolve();
          return;
        }

        let chunkIndex = 0;
        const speakNextChunk = () => {
          if (chunkIndex >= chunks.length) {
            browserUtteranceRef.current = null;
            setVoiceState("idle");
            resolve();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
          chunkIndex += 1;
          utterance.lang = languageRef.current;
          utterance.rate = 1;
          utterance.pitch = 1;
          browserUtteranceRef.current = utterance;

          utterance.onend = () => {
            if (browserUtteranceRef.current !== utterance) return;
            speakNextChunk();
          };

          utterance.onerror = (event) => {
            if (event.error === "canceled" || event.error === "interrupted") return;
            browserUtteranceRef.current = null;
            setVoiceState("idle");
            reject(new Error(`Browser speech failed: ${event.error}`));
          };

          window.speechSynthesis.speak(utterance);
        };

        setVoiceState("speaking");
        speakNextChunk();
      }),
    []
  );

  const speak = useCallback(
    async (text: string) => {
      const cleanText = cleanSpeechText(text);
      if (!cleanText) return;

      stopSpeaking();

      if (ELEVEN_LABS_API_KEY) {
        try {
          setVoiceState("speaking");
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`,
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
                  style: 0,
                  use_speaker_boost: true,
                },
              }),
            }
          );

          if (!response.ok) throw new Error(`TTS request failed with ${response.status}`);

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const audio = new Audio(objectUrl);
          audioRef.current = audio;
          audio.onended = () => {
            if (audioRef.current !== audio) return;
            releaseAudio();
            setVoiceState("idle");
          };
          audio.onerror = () => {
            if (audioRef.current !== audio) return;
            releaseAudio();
            setVoiceState("idle");
            void speakWithBrowser(cleanText).catch((error) => {
              console.error("Browser speech fallback failed", error);
              toast.error("Spoken responses are unavailable in this browser.");
            });
          };
          await audio.play();
          return;
        } catch (error) {
          console.warn("Premium speech service failed; using browser speech instead.", error);
          releaseAudio();
        }
      }

      try {
        await speakWithBrowser(cleanText);
      } catch (error) {
        console.error("Speech error", error);
        setVoiceState("idle");
        toast.error("Spoken responses are unavailable in this browser.");
      }
    },
    [releaseAudio, speakWithBrowser, stopSpeaking]
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
  };
}
