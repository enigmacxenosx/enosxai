/*
 * ENOSX AI — CommandBar
 * Enlarged floating command bar with voice visualization, micro-interactions
 * Features:
 *   - AI mode selector inside message bar as horizontal tabs
 *   - Larger message input area
 *   - Upward arrow send button
 *   - Auto-resize textarea, voice input, glassmorphism
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, MicOff, Square, Loader2, Plus, Image } from "lucide-react";
import { VoiceState } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import VoiceVisualizer from "./VoiceVisualizer";
import ConnectorPicker from "./ConnectorPicker";

export type AIMode = "ex" | "ex-pro" | "smart" | "fast" | "balanced" | "task" | "creative" | "imagine";

export interface AIModeOption {
  id: AIMode;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const AI_MODES: AIModeOption[] = [
  {
    id: "ex",
    label: "EX",
    color: "#7c6ff7",
    bgColor: "rgba(124,111,247,0.15)",
    borderColor: "rgba(124,111,247,0.4)",
  },
  {
    id: "ex-pro",
    label: "EX Pro",
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.15)",
    borderColor: "rgba(168,85,247,0.4)",
  },
  {
    id: "smart",
    label: "Smart",
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.4)",
  },
  {
    id: "fast",
    label: "Fast",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.4)",
  },
  {
    id: "balanced",
    label: "Analysis",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  {
    id: "task",
    label: "Reasoning",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  {
    id: "creative",
    label: "Creative",
    color: "#ec4899",
    bgColor: "rgba(236,72,153,0.15)",
    borderColor: "rgba(236,72,153,0.4)",
  },
  {
    id: "imagine",
    label: "Imagine",
    color: "#00f2ff",
    bgColor: "rgba(0,242,255,0.15)",
    borderColor: "rgba(0,242,255,0.4)",
  },
];

interface CommandBarProps {
  onSend: (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]) => void;
  onFileSelect?: (file: File) => void;
  isLoading: boolean;
  voiceState: VoiceState;
  transcript: string;
  isVoiceSupported: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onStopSpeaking: () => void;
  disabled?: boolean;
  isImageMode?: boolean;
  onToggleImageMode?: () => void;
  isFreeMode?: boolean;
}

export default function CommandBar({
  onSend,
  onFileSelect,
  isLoading,
  voiceState,
  transcript,
  isVoiceSupported,
  onStartVoice,
  onStopVoice,
  onStopSpeaking,
  disabled = false,
  isImageMode = false,
  onToggleImageMode,
  isFreeMode = false,
}: CommandBarProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [value, setValue] = useState("");
  const [aiMode, setAiMode] = useState<AIMode>("ex");
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isListening = voiceState === "listening";
  const isSpeaking = voiceState === "speaking";
  const isProcessing = voiceState === "processing";
  const voiceActive = isListening || isSpeaking || isProcessing;


  // Sync transcript to input
  useEffect(() => {
    if (transcript) {
      setValue(transcript);
    }
  }, [transcript]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || disabled || isLoading) return;
    onSend(text, aiMode, selectedConnectorIds);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, isLoading, onSend, aiMode, selectedConnectorIds]);

  const handleToggleConnector = useCallback((connectorId: string) => {
    setSelectedConnectorIds((current) =>
      current.includes(connectorId)
        ? current.filter((id) => id !== connectorId)
        : [...current, connectorId],
    );
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleVoiceClick = () => {
    if (isSpeaking) {
      onStopSpeaking();
    } else if (isListening) {
      onStopVoice();
    } else {
      onStartVoice();
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  return (
    <>
      {/* Voice overlay removed for seamless input experience */}

      {/* ── Main command bar (enlarged) ── */}
      <div className="px-4 pb-3 pt-1.5 flex-shrink-0">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          className="max-w-5xl mx-auto"
        >
          {/* Main input container — enlarged */}
          <motion.div
            animate={
              isListening
                ? {
                    boxShadow: [
                      `0 0 0 0 rgba(0,242,255, 0)`,
                      `0 0 0 3px rgba(0,242,255, 0.35)`,
                      `0 0 0 0 rgba(0,242,255, 0)`,
                    ],
                  }
                : { boxShadow: "none" }
            }
            transition={
              isListening
                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
            className={`flex flex-col gap-1.5 rounded-2xl px-4 py-2 transition-all duration-300 ${isListening ? 'shadow-[0_0_20px_rgba(0,242,255,0.2)]' : ''} rainbow-glow rainbow-glow-border`}
            style={{
              background: `rgba(12,12,16,${wallpaperSettings.panelOpacity})`,
              backdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
              WebkitBackdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: isListening ? "rgba(0, 242, 255, 0.5)" : "transparent",
              transition: "all 0.3s ease",
            }}
          >
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Choose AI mode">
              {AI_MODES.map((mode) => (
                <motion.button
                  key={`${mode.id}-${mode.label}`}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAiMode(mode.id)}
                  aria-pressed={aiMode === mode.id}
                  className="rounded-lg px-2.5 py-1 font-semibold text-[11px] whitespace-nowrap transition-all"
                  style={
                    aiMode === mode.id
                      ? {
                          background: mode.bgColor,
                          border: `1.5px solid ${mode.color}`,
                          color: mode.color,
                          boxShadow: `0 0 8px ${mode.color}33`,
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${mode.borderColor}`,
                          color: "rgba(255,255,255,0.62)",
                        }
                  }
                >
                  {mode.label}
                </motion.button>
              ))}

              <ConnectorPicker
                selectedConnectorIds={selectedConnectorIds}
                onToggleConnector={handleToggleConnector}
              />

              {isFreeMode && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-[10px] font-bold text-yellow-400 flex items-center gap-1.5"
                  title="Running in Free Mode due to low credits"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  FREE MODE
                </motion.div>
              )}
            </div>
	
	              {/* Textarea and buttons container */}
	              <div className="flex items-end gap-2">
                {/* Textarea — larger */}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
	                placeholder={
	                  isListening
	                    ? "Listening... Speak now."
	                    : isSpeaking
	                    ? "AI is speaking..."
	                    : "Ask ENOSX AI anything."
	                }
                rows={1}
                disabled={disabled && !isListening}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-snug"
                style={{
                  color: config.text,
                  caretColor: config.accent,
                  maxHeight: 144,
                  minHeight: 44,
                  paddingTop: "10px",
                  fontFamily: "'Eurostile', sans-serif",
                }}
              />

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Voice button */}
                {isVoiceSupported && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleVoiceClick}
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={
                      isListening || isSpeaking
                        ? {
                            background: `rgba(${config.accentRgb}, 0.2)`,
                            border: `1px solid rgba(${config.accentRgb}, 0.4)`,
                            color: config.accent,
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: config.textMuted,
                          }
                    }
                    title={isListening ? "Stop listening" : isSpeaking ? "Stop speaking" : "Voice input"}
                  >
                    {isListening && (
                      <motion.div
                        animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-xl"
                        style={{ border: `2px solid rgba(0,242,255, 0.5)` }}
                      />
                    )}
                    {isSpeaking ? (
                      <Square size={16} />
                    ) : isListening ? (
                      <MicOff size={16} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </motion.button>
                )}

                {/* Image generation toggle */}
                {onToggleImageMode && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onToggleImageMode}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={
                      isImageMode
                        ? {
                            background: `rgba(${config.accentRgb}, 0.15)`,
                            border: `1px solid rgba(${config.accentRgb}, 0.4)`,
                            color: config.accent,
                            boxShadow: `0 0 8px rgba(${config.accentRgb}, 0.2)`,
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: config.textMuted,
                          }
                    }
                    title={isImageMode ? "Image mode ON — next message generates an image" : "Toggle image generation mode"}
                  >
                    <Image size={16} />
                  </motion.button>
                )}

                {/* Send button — upward arrow */}
                <motion.button
                  whileHover={canSend ? { scale: 1.08 } : {}}
                  whileTap={canSend ? { scale: 0.92 } : {}}
                  onClick={handleSend}
                  disabled={!canSend}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={
                    canSend
                      ? {
                          background: `rgba(${config.accentRgb}, 0.85)`,
                          border: `1px solid rgba(${config.accentRgb}, 0.6)`,
                          color: "#fff",
                          boxShadow: `0 4px 12px rgba(${config.accentRgb}, 0.3)`,
                        }
                      : isLoading
                      ? {
                          background: `rgba(${config.accentRgb}, 0.12)`,
                          border: `1px solid rgba(${config.accentRgb}, 0.2)`,
                          color: config.accent,
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: config.textMuted,
                          cursor: "not-allowed",
                        }
                  }
                  title="Send"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 size={16} />
                    </motion.div>
                  ) : (
                    <ArrowUp size={16} strokeWidth={2.5} />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
