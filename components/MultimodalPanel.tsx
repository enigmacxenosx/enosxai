/*
 * ENOSX AI — MultimodalPanel Component
 * Integrates camera, voice interaction, and reactive AI face for immersive multimodal experience.
 * Supports real-time vision, speech-to-text, text-to-speech, and emotional face animations.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Eye, EyeOff, Globe } from "lucide-react";
import CameraFeed from "./CameraFeed";
import AIFace from "./AIFace";
import { useVoice } from "../hooks/useVoice";

interface MultimodalPanelProps {
  onVoiceInput?: (text: string) => void;
  onImageCapture?: (imageData: string) => void;
  aiResponse?: string;
  isAISpeaking?: boolean;
  accentColor?: string;
  accentRgb?: string;
}

export default function MultimodalPanel({
  onVoiceInput,
  onImageCapture,
  aiResponse,
  isAISpeaking = false,
  accentColor = "#00ff88",
  accentRgb = "0, 255, 136",
}: MultimodalPanelProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [emotion, setEmotion] = useState<"neutral" | "happy" | "thinking" | "focused" | "confused">("neutral");

  const { voiceState, startListening, stopListening, speak, setLanguage } = useVoice();

  // Detect emotion from AI response
  const detectEmotion = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("?") && lowerText.length < 100) {
      setEmotion("confused");
    } else if (lowerText.includes("!") || lowerText.includes("great") || lowerText.includes("awesome")) {
      setEmotion("happy");
    } else if (lowerText.includes("analyzing") || lowerText.includes("thinking") || lowerText.includes("processing")) {
      setEmotion("thinking");
    } else {
      setEmotion("focused");
    }
  }, []);

  // Handle voice input
  const handleVoiceStart = useCallback(() => {
    setLanguage(selectedLanguage);
    startListening((text) => {
      setEmotion("thinking");
      onVoiceInput?.(text);
    }, selectedLanguage);
  }, [selectedLanguage, startListening, setLanguage, onVoiceInput]);

  const handleVoiceStop = useCallback(() => {
    stopListening();
    setEmotion("neutral");
  }, [stopListening]);

  // Handle AI speech
  const handleAISpeak = useCallback(() => {
    if (aiResponse) {
      detectEmotion(aiResponse);
      speak(aiResponse);
    }
  }, [aiResponse, speak, detectEmotion]);

  // Language options
  const languages = [
    { code: "en-US", name: "English" },
    { code: "es-ES", name: "Español" },
    { code: "fr-FR", name: "Français" },
    { code: "de-DE", name: "Deutsch" },
    { code: "it-IT", name: "Italiano" },
    { code: "pt-BR", name: "Português" },
    { code: "ja-JP", name: "日本語" },
    { code: "zh-CN", name: "中文" },
    { code: "ru-RU", name: "Русский" },
    { code: "ar-SA", name: "العربية" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-4"
    >
      {/* AI Face Display */}
      <div className="flex justify-center py-6">
        <AIFace
          isListening={voiceState === "listening"}
          isSpeaking={isAISpeaking || voiceState === "speaking"}
          emotion={emotion}
          accentColor={accentColor}
          accentRgb={accentRgb}
          size="medium"
        />
      </div>

      {/* Camera Feed */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CameraFeed
              onFrameCapture={onImageCapture || (() => {})}
              accentColor={accentColor}
              accentRgb={accentRgb}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 px-4 py-3 rounded-lg"
        style={{
          background: `rgba(${accentRgb}, 0.05)`,
          border: `1px solid rgba(${accentRgb}, 0.2)`,
        }}
      >
        <Globe size={18} style={{ color: accentColor }} />
        <select
          value={selectedLanguage}
          onChange={(e) => {
            setSelectedLanguage(e.target.value);
            setLanguage(e.target.value);
          }}
          className="flex-1 bg-transparent text-sm font-medium outline-none"
          style={{ color: accentColor }}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} style={{ color: "#000" }}>
              {lang.name}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        {/* Voice Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={voiceState === "listening" ? handleVoiceStop : handleVoiceStart}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            background:
              voiceState === "listening"
                ? `rgba(255, 100, 100, 0.15)`
                : `rgba(${accentRgb}, 0.1)`,
            border: `1px solid ${voiceState === "listening" ? "#ff6464" : accentColor}`,
            color: voiceState === "listening" ? "#ff6464" : accentColor,
          }}
        >
          {voiceState === "listening" ? (
            <>
              <MicOff size={18} />
              Stop Listening
            </>
          ) : (
            <>
              <Mic size={18} />
              Start Listening
            </>
          )}
        </motion.button>

        {/* Camera Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCamera(!showCamera)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            background: showCamera ? `rgba(${accentRgb}, 0.15)` : `rgba(${accentRgb}, 0.1)`,
            border: `1px solid ${accentColor}`,
            color: accentColor,
          }}
        >
          {showCamera ? (
            <>
              <EyeOff size={18} />
              Hide Camera
            </>
          ) : (
            <>
              <Eye size={18} />
              Show Camera
            </>
          )}
        </motion.button>

        {/* AI Speak Button */}
        {aiResponse && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAISpeak}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              background: `rgba(${accentRgb}, 0.2)`,
              border: `1px solid ${accentColor}`,
              color: accentColor,
            }}
          >
            <Mic size={18} />
            Speak Response
          </motion.button>
        )}
      </div>

      {/* Status Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 justify-center text-xs"
        style={{ color: accentColor }}
      >
        {voiceState === "listening" && (
          <span className="px-2 py-1 rounded-full" style={{ background: `rgba(${accentRgb}, 0.1)` }}>
            🎤 Listening...
          </span>
        )}
        {isAISpeaking && (
          <span className="px-2 py-1 rounded-full" style={{ background: `rgba(${accentRgb}, 0.1)` }}>
            🔊 Speaking...
          </span>
        )}
        {showCamera && (
          <span className="px-2 py-1 rounded-full" style={{ background: `rgba(${accentRgb}, 0.1)` }}>
            📷 Camera Active
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
