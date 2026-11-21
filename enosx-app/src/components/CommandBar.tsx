/*
 * ENOSX AI — CommandBar
 * Message bar that mirrors the supplied EnosxAI reference:
 *   - rounded white/dark bar with the input on top
 *   - toolbar underneath: attach, connectors, workspace, voice, split send
 *   - fixed-size input that never grows after a prompt is sent
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Cloud,
  Expand,
  Laptop,
  Mic,
  MicOff,
  Plus,
  Square,
} from "lucide-react";
import { VoiceState, type Attachment } from "@/lib/types";
import ConnectorPicker from "./ConnectorPicker";
import VoiceVisualizer from "./VoiceVisualizer";
import { getModelTierRecommendation } from "@/lib/modelTierPolicy";
import { useTheme } from "@/contexts/ThemeContext";

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
    label: "ENOSX One",
    description: "Fast everyday assistance",
    color: "#7c6ff7",
    bgColor: "rgba(124,111,247,0.15)",
    borderColor: "rgba(124,111,247,0.4)",
  },
  {
    id: "ex-pro",
    label: "ENOSX Studio",
    description: "Deeper expert responses",
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.15)",
    borderColor: "rgba(168,85,247,0.4)",
  },
  {
    id: "enosh-mind",
    label: "ENOSX Nexus",
    description: "Strategic reasoning and analysis",
    color: "#00f2ff",
    bgColor: "rgba(0,242,255,0.15)",
    borderColor: "rgba(0,242,255,0.4)",
  },
];

const TIER_GUIDE = {
  everyday: getModelTierRecommendation("everyday_chat")?.label ?? "ENOSX One",
  technical: getModelTierRecommendation("coding_debugging")?.label ?? "ENOSX Studio",
  strategic: getModelTierRecommendation("architecture_strategy")?.label ?? "ENOSX Nexus",
} as const;

export function AIModePicker({ aiMode, onChange, className = "" }: { aiMode: AIMode; onChange: (mode: AIMode) => void; className?: string }) {
  const [modeOpen, setModeOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement>(null);
  const currentMode = AI_MODES.find((mode) => mode.id === aiMode) ?? AI_MODES[0];
  const { config } = useTheme();

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) setModeOpen(false);
    }
    if (modeOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [modeOpen]);

  return (
    <div className="relative" ref={modeRef}>
      <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setModeOpen((open) => !open)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all ${className}`} style={{ background: currentMode.bgColor, color: currentMode.color }} aria-haspopup="menu" aria-expanded={modeOpen} title={`AI mode: ${currentMode.label}`}>
        <span className="h-2 w-2 rounded-full" style={{ background: currentMode.color, boxShadow: `0 0 10px ${currentMode.color}88` }} />
        {currentMode.label}<ChevronDown size={12} style={{ transform: modeOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
      </motion.button>
      <AnimatePresence>
        {modeOpen && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full z-[60] mt-2 flex w-[min(274px,calc(100vw-5rem))] flex-col gap-1 rounded-[18px] p-2.5" style={{ background: config.isDark ? "rgba(30,31,35,0.88)" : "rgba(255,255,255,0.97)", border: `1px solid ${config.isDark ? "rgba(255,255,255,0.14)" : config.border}`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: config.isDark ? "0 12px 36px rgba(0,0,0,0.46)" : "0 16px 40px rgba(21,25,35,0.16)" }} role="menu" aria-label="Choose AI mode">
            <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: config.textMuted }}>Send with</p>
            {AI_MODES.map((mode) => {
              const selected = aiMode === mode.id;
              return (
                <motion.button type="button" key={mode.id} whileHover={{ backgroundColor: config.isDark ? "rgba(255,255,255,0.06)" : "rgba(21,25,35,0.045)" }} whileTap={{ scale: 0.98 }} onClick={() => { onChange(mode.id); setModeOpen(false); }} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition-all" style={{ background: selected ? (config.isDark ? "rgba(255,255,255,0.04)" : "rgba(21,25,35,0.045)") : "transparent", borderColor: selected ? mode.borderColor : "transparent" }} role="menuitemradio" aria-checked={selected}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: mode.color, boxShadow: `0 0 8px ${mode.color}66` }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="text-[13px] font-semibold" style={{ color: config.text }}>{mode.label}</span><span className="text-[11px] font-normal leading-4" style={{ color: config.textMuted }}>{mode.description}</span></span>
                  {selected && <Check size={14} className="shrink-0" style={{ color: mode.color }} />}
                </motion.button>
              );
            })}
            <div className="mt-1 border-t px-2.5 pt-2" style={{ borderColor: config.border }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: config.textMuted }}>Best tier by action</p>
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-4" style={{ color: config.textMuted }}>
                <span>Everyday, summary, draft</span><strong className="font-semibold" style={{ color: config.isDark ? "#c4b5fd" : "#6d28d9" }}>{TIER_GUIDE.everyday}</strong>
                <span>Code, research, GitHub, files</span><strong className="font-semibold" style={{ color: config.isDark ? "#e879f9" : "#a21caf" }}>{TIER_GUIDE.technical}</strong>
                <span>Strategy, science, high-risk</span><strong className="font-semibold" style={{ color: config.isDark ? "#67e8f9" : "#0e7490" }}>{TIER_GUIDE.strategic}</strong>
              </div>
              <p className="mt-1.5 text-[10px] leading-4" style={{ color: config.textMuted }}>Guidance is configurable product policy, not a guarantee of correctness.</p>
            </div>
            <p className="mt-1.5 border-t px-2.5 pt-2 text-[11px]" style={{ borderColor: config.border, color: config.textMuted }}>Current: {currentMode.label}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Workspace = "cloud" | "device";

const WORKSPACES: Array<{ id: Workspace; label: string; hint: string }> = [
  { id: "cloud", label: "Enosx Cloud", hint: "Runs in the cloud workspace" },
  { id: "device", label: "This device", hint: "Runs on your machine" },
];

function readStoredWorkspace(): Workspace {
  try {
    return localStorage.getItem("enosx-workspace") === "device" ? "device" : "cloud";
  } catch {
    return "cloud";
  }
}

interface WorkspacePickerProps {
  onOpenChange?: (open: boolean) => void;
}

function WorkspacePicker({ onOpenChange }: WorkspacePickerProps) {
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(readStoredWorkspace);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const current = WORKSPACES.find((item) => item.id === workspace) ?? WORKSPACES[0];

  const choose = (next: Workspace) => {
    setWorkspace(next);
    try {
      localStorage.setItem("enosx-workspace", next);
    } catch {
      /* storage can be unavailable in private windows */
    }
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="enosx-pill enosx-pill--device"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Workspace: ${current.label}`}
        title={`Workspace: ${current.label}`}
      >
        <Cloud size={16} />
        <span className="enosx-pill__label">{current.label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="enosx-menu"
            role="menu"
            aria-label="Choose workspace"
          >
            {WORKSPACES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={workspace === item.id}
                onClick={() => choose(item.id)}
                className="enosx-menu__item"
              >
                {item.id === "cloud" ? <Cloud size={16} /> : <Laptop size={16} />}
                <span className="enosx-menu__copy">
                  <span className="enosx-menu__title">{item.label}</span>
                  <span className="enosx-menu__hint">{item.hint}</span>
                </span>
                {workspace === item.id && <Check size={14} className="enosx-menu__check" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CommandBarProps {
  onSend: (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]) => void;
  onQueue?: (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]) => void;
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
  onUpscaleVideo?: (file: File) => void;
  attachments?: Attachment[];
  waitingCount?: number;
  tightBottom?: boolean;
  animateEntrance?: boolean;
  userDisplayName?: string;
  aiMode: AIMode;
}

export default function CommandBar({
  onSend,
  onQueue,
  onDraftChange,
  isLoading,
  voiceState,
  audioStream,
  transcript,
  isVoiceSupported,
  onStartVoice,
  onStopVoice,
  onStopSpeaking,
  disabled = false,
  onFilesSelected,
  onUpscaleVideo,
  attachments = [],
  waitingCount = 0,
  tightBottom = false,
  animateEntrance = true,
  userDisplayName,
  aiMode,
}: CommandBarProps) {
  const [value, setValue] = useState("");
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upscaleInputRef = useRef<HTMLInputElement>(null);

  const isListening = voiceState === "listening";
  const isSpeaking = voiceState === "speaking";
  const currentMode = AI_MODES.find((mode) => mode.id === aiMode) ?? AI_MODES[0];

  const hasImageAttachment = attachments.some((file) =>
    /image/i.test(`${file.mimeType ?? ""} ${file.type}`) || /\.(png|jpe?g|gif|webp|bmp|avif|heic)$/i.test(file.name),
  );
  const hasVideoAttachment = attachments.some((file) =>
    /video/i.test(`${file.mimeType ?? ""} ${file.type}`) || /\.(mp4|m4v|webm|mov|avi|mkv)$/i.test(file.name),
  );
  const firstName = userDisplayName?.trim().split(/\s+/)[0];
  const personalizedPlaceholder = firstName && !/^(guest|user)$/i.test(firstName)
    ? `What can I help you with, ${firstName}?`
    : "Ask Enosx AI to do something…";
  const contextualPlaceholder = hasImageAttachment && hasVideoAttachment
    ? "Analyze your image and video in real time…"
    : hasVideoAttachment
      ? "Ask ENOSX to inspect your video in real time…"
      : hasImageAttachment
        ? "Ask ENOSX to analyze your image…"
        : personalizedPlaceholder;
  const placeholder = isListening
    ? "Listening… Speak now."
    : isSpeaking
      ? "AI is speaking…"
      : window.innerWidth < 768 && window.innerWidth <= 360
        ? "Ask…"
        : contextualPlaceholder;

  // Sync transcript to input
  useEffect(() => {
    if (transcript) {
      setValue(transcript);
    }
  }, [transcript]);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, aiMode, selectedConnectorIds);
    setValue("");
    onDraftChange?.(false);
    // The input keeps its fixed height after sending; only the scroll resets.
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  }, [value, disabled, onSend, aiMode, selectedConnectorIds, onDraftChange]);

  const handleQueue = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    (onQueue ?? onSend)(text, aiMode, selectedConnectorIds);
    setValue("");
    onDraftChange?.(false);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  }, [value, disabled, onQueue, onSend, aiMode, selectedConnectorIds, onDraftChange]);

  const handleToggleConnector = useCallback((connectorId: string) => {
    setSelectedConnectorIds((current) =>
      current.includes(connectorId)
        ? current.filter((id) => id !== connectorId)
        : [...current, connectorId],
    );
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleUpscalePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUpscaleVideo?.(file);
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
  const voiceActive = isListening || isSpeaking;
  const modeRgb = currentMode.color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  const accentRgb = modeRgb
    ? `${parseInt(modeRgb[1], 16)}, ${parseInt(modeRgb[2], 16)}, ${parseInt(modeRgb[3], 16)}`
    : "124, 111, 247";

  return (
    <div className={`relative ${tightBottom ? "pb-0" : "pb-2"} pt-1 shrink-0`}>
      {waitingCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-full z-30 mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-[11px] text-cyan-100/75" role="status">
          <span>{waitingCount} waiting message{waitingCount === 1 ? "" : "s"} queued — ENOSX AI will handle them in order.</span>
        </div>
      )}

      <motion.div
        initial={animateEntrance ? { y: 12, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={animateEntrance ? { type: "spring", stiffness: 300, damping: 30, delay: 0.1 } : { duration: 0 }}
        className="mx-auto w-full"
      >
        <div
          className={`enosx-composer${isListening ? " enosx-composer--listening" : ""}`}
          data-mode={aiMode}
        >
          {voiceActive && (
            <div data-testid="voice-waveform-panel" className="mx-1 mb-2 h-10">
              <VoiceVisualizer
                isActive={voiceActive}
                isListening={isListening}
                color={currentMode.color}
                accentRgb={accentRgb}
                audioStream={audioStream}
              />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              const nextValue = e.target.value;
              setValue(nextValue);
              onDraftChange?.(nextValue.trim().length > 0);
              if (/^enosx$/i.test(nextValue.trim())) {
                window.dispatchEvent(new CustomEvent("enosx-open-onboarding"));
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled && !isListening}
            aria-label="Message"
            className="enosx-composer__input"
          />

          <div className="enosx-composer__tools">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml"
              className="hidden"
              onChange={handleFilePickerChange}
            />
            {onFilesSelected && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="enosx-icon"
                title="Add attachment"
                aria-label="Add attachment"
              >
                <Plus size={18} />
              </button>
            )}
            {onUpscaleVideo && import.meta.env.VITE_NVIDIA_VSR_ENABLED === "true" && (
              <>
                <input
                  ref={upscaleInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                  className="hidden"
                  onChange={handleUpscalePickerChange}
                />
                <button
                  type="button"
                  onClick={() => upscaleInputRef.current?.click()}
                  className="enosx-icon"
                  title="Upscale a video with NVIDIA VSR"
                  aria-label="Upscale a video with NVIDIA VSR"
                >
                  <Expand size={18} />
                </button>
              </>
            )}

            <ConnectorPicker
              trigger="compact"
              selectedConnectorIds={selectedConnectorIds}
              onToggleConnector={handleToggleConnector}
            />

            <WorkspacePicker />

            <div className="enosx-composer__spacer" />

            {isVoiceSupported && (
              <button
                type="button"
                onClick={handleVoiceClick}
                className={`enosx-icon enosx-icon--plain${voiceActive ? " is-active" : ""}`}
                title={isListening ? "Stop listening" : isSpeaking ? "Stop speaking" : "Voice input"}
                aria-label={isListening ? "Stop listening" : isSpeaking ? "Stop speaking" : "Voice input"}
              >
                {isSpeaking ? <Square size={16} /> : isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            <div className="relative shrink-0">
              <div className="enosx-send" data-ready={canSend}>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="enosx-send__go"
                  aria-label="Send message"
                  title={isLoading ? "Add to waiting list" : "Send message"}
                >
                  <ArrowUp size={18} strokeWidth={2.6} />
                </button>
                <button
                  type="button"
                  onClick={handleQueue}
                  disabled={!canSend}
                  className="enosx-send__more"
                  aria-label="Add message to queue"
                  title="Add message to queue"
                >
                  <ChevronDown size={14} strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
