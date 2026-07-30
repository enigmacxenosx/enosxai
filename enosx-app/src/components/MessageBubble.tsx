/*
 * ENOSX AI — MessageBubble
 * Animated message bubbles with streaming text, markdown, voice playback,
 * and inline image display for both user attachments and AI-generated images.
 * Features: fade-in spring, streaming cursor, copy, speak, glassmorphism,
 * document download, image lightbox.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Volume2, VolumeX, Check, Download, FileText } from "lucide-react";
import { Message } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import ImageDisplay from "./ImageDisplay";

interface MessageBubbleProps {
  message: Message;
  index: number;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  isSpeaking: boolean;
}

// ── Image URL detection regex ───────────────────────────────────────────────────
// Matches markdown image syntax: ![alt](url)
// Also matches raw URLs that look like image URLs
const IMAGE_URL_REGEX = /\!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\)]*)?)\)/gi;
const RAW_IMAGE_URL_REGEX = /https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\)]*)?/gi;

interface ParsedImage {
  url: string;
  alt: string;
  position: number;
  length: number;
}

function extractImagesFromText(text: string): ParsedImage[] {
  const images: ParsedImage[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  IMAGE_URL_REGEX.lastIndex = 0;

  while ((match = IMAGE_URL_REGEX.exec(text)) !== null) {
    images.push({
      url: match[2],
      alt: match[1] || "Generated image",
      position: match.index,
      length: match[0].length,
    });
  }

  return images;
}

// Split text by image placeholders, rendering images between text segments
function renderContentWithImages(text: string, accentColor: string) {
  const images = extractImagesFromText(text);

  if (images.length === 0) {
    // No images — render as normal markdown
    return (
      <div
        className="prose-crimson text-sm"
        style={{ color: accentColor }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }

  // Split text into segments around images
  const segments: Array<{ type: "text"; content: string } | { type: "image"; url: string; alt: string }> = [];
  let lastEnd = 0;

  for (const img of images) {
    if (img.position > lastEnd) {
      const textBefore = text.slice(lastEnd, img.position);
      if (textBefore.trim()) {
        segments.push({ type: "text", content: textBefore });
      }
    }
    segments.push({ type: "image", url: img.url, alt: img.alt });
    lastEnd = img.position + img.length;
  }

  // Remaining text after last image
  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd);
    if (remaining.trim()) {
      segments.push({ type: "text", content: remaining });
    }
  }

  // Render segments
  return (
    <div className="flex flex-col gap-2">
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return (
            <div
              key={i}
              className="prose-crimson text-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(segment.content) }}
            />
          );
        } else {
          return (
            <ImageDisplay
              key={i}
              src={segment.url}
              alt={segment.alt}
            />
          );
        }
      })}
    </div>
  );
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

// Image generation loading state for assistant
function ImageGeneratingIndicator({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [0.7, 1.1, 0.7], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: accent, opacity: 0.6 }}>
        Generating image...
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

  // Check if assistant message is generating an image (text starts with image generation indicator)
  const isGeneratingImage = !isUser && message.content.includes("🖼️") && isStreaming;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'md' | 'pdf' = 'md') => {
    if (format === 'md') {
      const blob = new Blob([message.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enosx-doc-${new Date().getTime()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Basic PDF generation logic
      const splitText = doc.splitTextToSize(message.content.replace(/[*#`]/g, ''), 180);
      doc.setFontSize(12);
      doc.text(splitText, 15, 20);
      doc.save(`enosx-doc-${new Date().getTime()}.pdf`);
    }
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
      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`relative transition-all duration-300 ${!isUser && (isEmpty || isStreaming) ? 'rainbow-glow' : ''}`}
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
        >
          {isEmpty ? (
            <ThinkingDots color={config.accent} />
          ) : (
            <div className="relative">
              {isUser ? (
                <div className="flex flex-col gap-3">
                  {/* User image attachments */}
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

                  {/* User non-image attachments */}
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
                              <span className="text-sm font-medium truncate text-white/90 group-hover:text-white">
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
                <div className="flex flex-col gap-2">
                  {/* Assistant content with inline image support */}
                  {renderContentWithImages(message.content, config.accent)}
                  {isGeneratingImage && (
                    <ImageGeneratingIndicator accent={config.accent} />
                  )}
                  {isStreaming && message.content && (
                    <StreamingCursor color={config.accent} />
                  )}
                </div>
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
            className={`flex items-center gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: copied ? config.accent : config.textMuted,
              }}
              title="Copy"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </motion.button>

            {!isUser && (
              <>
	                <motion.button
	                  whileHover={{ scale: 1.1 }}
	                  whileTap={{ scale: 0.9 }}
	                  onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(message.content))}
	                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
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
	                  {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
	                </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleDownload('pdf'); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: config.textMuted,
                    }}
                    title="Export as PDF"
                  >
                    <FileText size={12} />
                  </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleDownload('md'); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: config.textMuted,
                  }}
                  title="Download as Markdown"
                >
                  <Download size={12} />
                </motion.button>
              </>
            )}

            <span
              className="text-xs ml-1"
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
