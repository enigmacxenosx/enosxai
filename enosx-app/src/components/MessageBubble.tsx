/*
 * ENOSX AI — MessageBubble
 * Animated message bubbles with streaming text, markdown, voice playback
 * Features: fade-in spring, streaming cursor, copy, speak, glassmorphism
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Volume2, VolumeX, Check, FileText } from "lucide-react";
import { Message } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";

interface MessageBubbleProps {
  message: Message;
  index: number;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  isSpeaking: boolean;
}

// Simple markdown renderer — handles bold, italic, code, headers, lists, links
function renderMarkdown(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupol]|<pre|<code)(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`);
}

// Typing cursor component
function StreamingCursor({ color }: { color: string }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full"
      style={{ background: color, verticalAlign: "middle" }}
    />
  );
}

// Thinking dots animation
function ThinkingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [0.6, 1, 0.6],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          className="w-1.5 h-1.5 rounded-full rainbow-thinking-dot"
          style={{
            background: color,
            animation: "rainbow-thinking-dot 4s ease-in-out infinite",
          }}
        />
      ))}
      <span className="text-xs ml-1" style={{ color, opacity: 0.6, letterSpacing: "0.06em" }}>
        THINKING
      </span>
    </div>
  );
}

export default function MessageBubble({
  message,
  index,
  onSpeak,
  onStopSpeak,
  isSpeaking,
}: MessageBubbleProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;
  const isEmpty = !message.content?.trim() && isStreaming;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: Math.min(index * 0.04, 0.3),
      }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar removed - no icons for user/bot */}

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`relative rounded-2xl px-4 py-3 transition-all duration-300 ${!isUser && (isEmpty || isStreaming) ? 'rainbow-glow' : ''}`}
          style={
            isUser
              ? {
                  background: `rgba(${config.accentRgb}, 0.12)`,
                  border: `1px solid rgba(${config.accentRgb}, 0.25)`,
                  backdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
                  WebkitBackdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
                  boxShadow: `0 4px 20px rgba(${config.accentRgb}, 0.08)`,
                }
              : {
                  background: `rgba(12,12,24,${wallpaperSettings.panelOpacity * 0.7})`,
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
                  WebkitBackdropFilter: `blur(${wallpaperSettings.blurAmount}px)`,
                  boxShadow: !isUser && (isEmpty || isStreaming) ? "none" : "0 4px 20px rgba(0,0,0,0.3)",
                }
          }
        >
          {isEmpty ? (
            <ThinkingDots color={config.accent} />
          ) : (
            <div className="relative">
              {isUser ? (
                <div className="flex flex-col gap-3">
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {message.attachments.map((att) => {
                        const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(att.type.toLowerCase());
                        if (!isImage) return null;
                        return (
                          <motion.img
                            key={att.id}
                            src={att.content}
                            alt={att.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10 shadow-lg object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                            onClick={() => window.open(att.content, '_blank')}
                          />
                        );
                      })}
                    </div>
                  )}

                  {message.attachments && message.attachments.some(att => !["jpg", "jpeg", "png", "gif", "webp"].includes(att.type.toLowerCase())) && (
                    <div className="flex flex-col gap-2 mb-1">
                      {message.attachments.map((att) => {
                        const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(att.type.toLowerCase());
                        if (isImage) return null;
                        return (
                          <motion.div
                            key={att.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = att.content;
                              link.download = att.name;
                              link.click();
                            }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <FileText size={18} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium truncate text-white/90 group-hover:text-white">
                                {att.name}
                              </span>
                              <span className="text-[10px] text-white/40">
                                {(att.size / 1024).toFixed(1)} KB • {att.type.toUpperCase()}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: config.text }}
                  >
                    {message.content}
                  </p>
                </div>
              ) : (
                <div
                  className="prose-crimson text-sm"
                  style={{ color: config.text }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                />
              )}
              {isStreaming && message.content && (
                <StreamingCursor color={config.accent} />
              )}
            </div>
          )}
        </motion.div>

        {/* Action buttons */}
        {!isStreaming && message.content && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center gap-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: copied ? config.accent : config.textMuted,
              }}
              title="Copy"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </motion.button>

            {!isUser && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(message.content))}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{
                  background: isSpeaking
                    ? `rgba(${config.accentRgb}, 0.12)`
                    : "rgba(255,255,255,0.04)",
                  border: isSpeaking
                    ? `1px solid rgba(${config.accentRgb}, 0.3)`
                    : "1px solid rgba(255,255,255,0.07)",
                  color: isSpeaking ? config.accent : config.textMuted,
                }}
                title={isSpeaking ? "Stop speaking" : "Speak"}
              >
                {isSpeaking ? <VolumeX size={10} /> : <Volume2 size={10} />}
              </motion.button>
            )}

            <span
              className="text-xs"
              style={{ color: config.textMuted, fontSize: "10px", opacity: 0.6 }}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
