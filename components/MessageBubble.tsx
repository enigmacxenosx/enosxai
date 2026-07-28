/*
 * ENOSX AI — MessageBubble
 * Animated message bubbles with streaming text, markdown, voice playback
 * Features: fade-in spring, streaming cursor, copy, speak, glassmorphism
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Volume2, VolumeX, Check } from "lucide-react";
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
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: config.text }}
                >
                  {message.content}
                </p>
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
