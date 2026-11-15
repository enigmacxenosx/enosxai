/*
 * ENOSX AI — CommandBar
 * Focused premium composer with voice visualization and concise mode controls.
 * Features:
 *   - AI mode selector inside the message bar as a three-tier dropdown
 *   - Larger message input area
 *   - Upward arrow send button
 *   - Fixed-height textarea, voice input, glassmorphism
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic, MicOff, Square, Clock3, ChevronDown, Plus } from "lucide-react";
import { VoiceState, type Attachment } from "@/lib/types";
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
    description: "Fast everyday assistance",
    color: "#7c6ff7",
    bgColor: "rgba(124,111,247,0.15)",
    borderColor: "rgba(124,111,247,0.4)",
  },
  {
    id: "ex-pro",
    label: "EX Pro",
    description: "Deeper expert responses",
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.15)",
    borderColor: "rgba(168,85,247,0.4)",
  },
  {
    id: "enosh-mind",
    label: "ENOSH MIND",
    description: "Strategic reasoning and analysis",
    color: "#00f2ff",
    bgColor: "rgba(0,242,255,0.15)",
    borderColor: "rgba(0,242,255,0.4)",
  },
];

export function AIModePicker({ aiMode, onChange }: { aiMode: AIMode; onChange: (mode: AIMode) => void }) {
  const [modeOpen, setModeOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement>(null);
  const currentMode = AI_MODES.find((mode) => mode.id === aiMode) ?? AI_MODES[0];

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) setModeOpen(false);
    }
    if (modeOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [modeOpen]);

  return (
    <div className="relative" ref={modeRef}>
      <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setModeOpen((open) => !open)} className="flex items-center gap-1 rounded-full border-0 bg-transparent px-1.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all" style={{ background: "transparent", borderColor: "transparent", color: currentMode.color }} aria-haspopup="menu" aria-expanded={modeOpen} title={`AI mode: ${currentMode.label}`}>
        {currentMode.label}<ChevronDown size={11} style={{ transform: modeOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
      </motion.button>
      <AnimatePresence>
        {modeOpen && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full z-50 mt-2 flex min-w-[250px] flex-col gap-1 rounded-2xl p-1.5" style={{ background: "rgba(12,12,18,0.97)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} role="menu">
            {AI_MODES.map((mode) => (
              <motion.button type="button" key={mode.id} whileHover={{ backgroundColor: "rgba(255,255,255,0.07)" }} whileTap={{ scale: 0.95 }} onClick={() => { onChange(mode.id); setModeOpen(false); }} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-left transition-all" style={aiMode === mode.id ? { background: mode.bgColor, border: `1px solid ${mode.color}66`, color: mode.color } : { background: "rgba(255,255,255,0.04)", border: "1px solid transparent", color: "rgba(255,255,255,0.55)" }} role="menuitem">
                <span className="flex flex-col gap-0.5"><span className="text-xs font-semibold whitespace-nowrap">{mode.label}</span><span className="text-[10px] font-normal opacity-70 whitespace-nowrap">{mode.description}</span></span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CommandBarProps {
  onSend: (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]) => void;
  onDraftChange?: (hasDraft: boolean) => void;
  isLoading: boolean;
  voiceState: VoiceState;
  audioStream?: MediaStream | null;
  transcript: string;
  isVoiceSupported: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onStopSpeaking: () => void;
  disabled?: boolean;
  isFreeMode?: boolean;
  onFilesSelected?: (files: File[]) => void;
  attachments?: Attachment[];
  waitingCount?: number;
  tightBottom?: boolean;
  animateEntrance?: boolean;
  userDisplayName?: string;
  aiMode: AIMode;
}

export default function CommandBar({
  onSend,
  onDraftChange,
  isLoading,
  voiceState,
  audioStream = null,
  transcript,
  isVoiceSupported,
  onStartVoice,
  onStopVoice,
  onStopSpeaking,
  disabled = false,
  isFreeMode = false,
  onFilesSelected,
  attachments = [],
  waitingCount = 0,
  tightBottom = false,
  animateEntrance = true,
  userDisplayName,
  aiMode,
}: CommandBarProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [value, setValue] = useState("");
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isListening = voiceState === "listening";
  const isSpeaking = voiceState === "speaking";
  const isProcessing = voiceState === "processing";
  const voiceActive = isListening || isSpeaking || isProcessing;

  const hasImageAttachment = attachments.some((file) =>
    /image/i.test(`${file.mimeType ?? ""} ${file.type}`) || /\.(png|jpe?g|gif|webp|bmp|avif|heic)$/i.test(file.name),
  );
  const hasVideoAttachment = attachments.some((file) =>
    /video/i.test(`${file.mimeType ?? ""} ${file.type}`) || /\.(mp4|m4v|webm|mov|avi|mkv)$/i.test(file.name),
  );
  const firstName = userDisplayName?.trim().split(/\s+/)[0];
  const personalizedPlaceholder = firstName && !/^(guest|user)$/i.test(firstName)
    ? `What can I help you with, ${firstName}?`
    : "Ask Enosx anything...";
  const contextualPlaceholder = hasImageAttachment && hasVideoAttachment
    ? "Analyze your image and video in real time..."
    : hasVideoAttachment
      ? "Ask ENOSX to inspect your video in real time..."
      : hasImageAttachment
        ? "Ask ENOSX to analyze your image..."
        : personalizedPlaceholder;
  const phonePlaceholder = window.innerWidth <= 360
    ? "Ask..."
    : hasImageAttachment && hasVideoAttachment
      ? "Ask about media..."
      : hasVideoAttachment
        ? "Ask about video..."
        : hasImageAttachment
          ? "Ask about image..."
          : "Ask ENOSX...";

  // Sync transcript to input
  useEffect(() => {
    if (transcript) {
      setValue(transcript);
    }
  }, [transcript]);

  // Keep the composer stable while text and streamed replies update around it.
  // Long drafts remain scrollable inside the fixed-height field instead of
  // changing the height of the message bar.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const fixedHeight = 36;
    ta.style.height = `${fixedHeight}px`;
    ta.style.overflowY = ta.scrollHeight > fixedHeight ? "auto" : "hidden";
  }, [value]);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, aiMode, selectedConnectorIds);
    setValue("");
    onDraftChange?.(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
      textareaRef.current.style.overflowY = "hidden";
      textareaRef.current.scrollTop = 0;
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

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <>
      {/* Voice overlay removed for seamless input experience */}

      {/* ── Main command bar ── */}
      <div className={`relative px-4 ${tightBottom ? "pb-0" : "pb-2"} pt-1 flex-shrink-0`}>
        {waitingCount > 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-full z-30 mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-[11px] text-cyan-100/75" role="status">
            <Clock3 size={13} className="shrink-0 text-cyan-300" />
            <span>{waitingCount} waiting message{waitingCount === 1 ? "" : "s"} queued — ENOSX AI will handle them in order.</span>
          </div>
        )}
        <motion.div
          initial={animateEntrance ? { y: 20, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={animateEntrance ? { type: "spring", stiffness: 300, damping: 30, delay: 0.1 } : { duration: 0 }}
          className="mx-auto w-full max-w-none"
        >
          {/* Main input container */}
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
            className={`phone-command-shell flex flex-col gap-1.5 rounded-[18px] px-3 py-1.5 transition-all duration-300 ${isListening ? 'shadow-[0_0_0_3px_rgba(155,140,255,0.16)]' : ''}`}
            style={{
              background: `rgba(21,21,29,${Math.max(wallpaperSettings.panelOpacity, 0.92)})`,
              backdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
              WebkitBackdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: isListening ? `rgba(${config.accentRgb}, 0.42)` : "rgba(255,255,255,0.09)",
              transition: "all 0.3s ease",
            }}
          >
            {/* Textarea and buttons container */}
            <div className="flex flex-col gap-1.5">
                {/* Compact textarea */}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setValue(nextValue);
                  onDraftChange?.(nextValue.trim().length > 0);
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
                      : window.innerWidth < 768
                        ? phonePlaceholder
                        : contextualPlaceholder
                }
                rows={1}
                disabled={disabled && !isListening}
                className="min-w-0 w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed"
                style={{
                  color: config.text,
                  caretColor: config.accent,
                  height: 30,
                  maxHeight: 30,
                  minHeight: 30,
                  paddingTop: "2px",
                  fontFamily: "var(--font-body)",
                }}
              />

              {/* Reference-style toolbar: attach and connectors on the left; voice and send on the right. */}
              <div className="flex w-full items-center gap-2">
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml" className="hidden" onChange={handleFilePickerChange} />
                {onFilesSelected && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-white/[0.07]"
                    style={{ background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: config.text }}
                    title="Add attachment"
                    aria-label="Add attachment"
                  >
                    <Plus size={16} />
                  </motion.button>
                )}
                <ConnectorPicker
                  selectedConnectorIds={selectedConnectorIds}
                  onToggleConnector={handleToggleConnector}
                />
                <div className="flex-1" />

                {isVoiceSupported && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVoiceClick}
                    className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white"
                    style={isListening || isSpeaking ? {
                      background: `rgba(${config.accentRgb}, 0.2)`,
                      border: `1px solid rgba(${config.accentRgb}, 0.32)`,
                      color: config.accent,
                    } : { border: "1px solid transparent" }}
                    title={isListening ? "Stop listening" : isSpeaking ? "Stop speaking" : "Voice input"}
                    aria-label={isListening ? "Stop listening" : isSpeaking ? "Stop speaking" : "Voice input"}
                  >
                    {isSpeaking ? <Square size={16} /> : isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </motion.button>
                )}

                <motion.button
                  type="button"
                  whileHover={canSend ? { scale: 1.04 } : {}}
                  whileTap={canSend ? { scale: 0.96 } : {}}
                  onClick={handleSend}
                  disabled={!canSend}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed"
                  style={canSend ? {
                    background: `rgba(${config.accentRgb}, 0.96)`,
                    color: "#fff",
                    boxShadow: `0 4px 12px rgba(${config.accentRgb}, 0.24)`,
                  } : {
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.38)",
                  }}
                  title={isLoading ? "Add to waiting list" : "Send"}
                  aria-label="Send message"
                >
                  {isLoading ? <Clock3 size={14} /> : <ArrowUp size={16} strokeWidth={2.5} />}
                </motion.button>
              </div>
              <AnimatePresence initial={false}>
                {isListening && (
                  <motion.div
                    key="voice-waveform"
                    data-testid="voice-waveform-panel"
                    initial={{ height: 0, opacity: 0, y: -4 }}
                    animate={{ height: 44, opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <VoiceVisualizer
                      isActive={isListening}
                      isListening={isListening}
                      color={config.accent}
                      accentRgb={config.accentRgb}
                      audioStream={audioStream}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
