/*
 * ENOSX AI — CommandBar
 * Enlarged floating command bar with voice visualization, micro-interactions
 * Features:
 *   - AI mode selector inside the message bar as a three-tier dropdown
 *   - Larger message input area
 *   - Upward arrow send button
 *   - Auto-resize textarea, voice input, glassmorphism
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic, MicOff, Square, Loader2, ChevronDown, Paperclip } from "lucide-react";
import { VoiceState } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import VoiceVisualizer from "./VoiceVisualizer";
import ConnectorPicker from "./ConnectorPicker";

export type AIMode = "ex-core" | "ex-pro" | "enosh-mind";

export interface AIModeOption {
  id: AIMode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const AI_MODES: AIModeOption[] = [
  {
    id: "ex-core",
    label: "EX Core",
    description: "Everyday intelligence",
    color: "#7c6ff7",
    bgColor: "rgba(124,111,247,0.15)",
    borderColor: "rgba(124,111,247,0.4)",
  },
  {
    id: "ex-pro",
    label: "EX Pro",
    description: "Expert intelligence",
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.15)",
    borderColor: "rgba(168,85,247,0.4)",
  },
  {
    id: "enosh-mind",
    label: "ENOSH MIND",
    description: "Maximum intelligence",
    color: "#00f2ff",
    bgColor: "rgba(0,242,255,0.15)",
    borderColor: "rgba(0,242,255,0.4)",
  },
];

const QUICK_SUGGESTIONS = ["Explain simply", "Add examples", "Make a plan"];

interface CommandBarProps {
  onSend: (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]) => void;
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
  onFilesSelected?: (files: File[]) => void;
}

export default function CommandBar({
  onSend,
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
  onFilesSelected,
}: CommandBarProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [value, setValue] = useState("");
  const [aiMode, setAiMode] = useState<AIMode>("ex-core");
  const [modeOpen, setModeOpen] = useState(false);
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeOpen(false);
      }
    }
    if (modeOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [modeOpen]);

  const isListening = voiceState === "listening";
  const isSpeaking = voiceState === "speaking";
  const isProcessing = voiceState === "processing";
  const voiceActive = isListening || isSpeaking || isProcessing;

  const currentMode = AI_MODES.find((m) => m.id === aiMode) ?? AI_MODES[0];

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

  const handleFilePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onFilesSelected?.(files);
    event.target.value = "";
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
            <AnimatePresence initial={false} mode="popLayout">
              {value.trim().length > 0 && !disabled && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 3, scale: 0.99 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.23, 1, 0.32, 1],
                    scale: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
                  }}
                  className="flex items-center gap-1.5 overflow-x-auto px-1 pt-0.5"
                  aria-label="Prompt suggestions"
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.14, delay: 0.03 }}
                    className="mr-0.5 shrink-0 text-[10px] text-white/35"
                  >
                    Try
                  </motion.span>
                  {QUICK_SUGGESTIONS.map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      type="button"
                      initial={{ opacity: 0, x: -3 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.16,
                        delay: 0.04 + index * 0.035,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97, y: 0 }}
                      onClick={() => setValue((current) => `${current.trimEnd()}\n\n${suggestion}`)}
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] leading-none text-white/60 transition-[color,background-color,border-color,transform] duration-150 hover:text-white/90"
                      style={{
                        borderColor: `rgba(${config.accentRgb}, 0.2)`,
                        background: `rgba(${config.accentRgb}, 0.06)`,
                      }}
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Mode selector — single compact tab with dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={modeRef}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setModeOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all"
                  style={{
                    background: currentMode.bgColor,
                    border: `1.5px solid ${currentMode.color}`,
                    color: currentMode.color,
                    boxShadow: `0 0 8px ${currentMode.color}33`,
                  }}
                >
                  {currentMode.label}
                  <ChevronDown
                    size={11}
                    style={{
                      transform: modeOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </motion.button>
              </div>

              <ConnectorPicker
                selectedConnectorIds={selectedConnectorIds}
                onToggleConnector={handleToggleConnector}
              />

            </div>

              <AnimatePresence>
                {modeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 flex flex-col gap-1.5 p-2 rounded-xl z-50"
                    style={{
                      background: "rgba(12,12,18,0.97)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                      minWidth: 250,
                    }}
                  >
                    {AI_MODES.map((mode) => (
                      <motion.button
                        key={mode.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setAiMode(mode.id); setModeOpen(false); }}
                        className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-left transition-all"
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
                                border: "1px solid rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.55)",
                              }
                        }
                      >
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs whitespace-nowrap">{mode.label}</span>
                          <span className="text-[10px] font-normal opacity-70 whitespace-nowrap">{mode.description}</span>
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
	              </AnimatePresence>
	
	              {/* Textarea and buttons container */}
	              <div className="flex items-end gap-2">
                {/* Textarea — larger */}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setValue(nextValue);
                  // Let the chat shell open guided setup immediately when the
                  // user types the wake word, without requiring Send/Enter.
                  if (/^enosx$/i.test(nextValue.trim())) {
                    window.dispatchEvent(new CustomEvent("enosx-open-onboarding"));
                  }
                }}
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
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilePickerChange} />
                {onFilesSelected && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: config.textMuted }}
                    title="Attach any file"
                    aria-label="Attach any file"
                  >
                    <Paperclip size={16} />
                  </motion.button>
                )}

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
