/*
 * ENOSX AI — MessageBubble
 * Animated message bubbles with streaming text, markdown, voice playback,
 * and inline image/video previews for public URLs and attachments.
 * Features: fade-in spring, streaming cursor, copy, speak, glassmorphism,
 * document download, image lightbox.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Volume2, VolumeX, Check, Download, ExternalLink, FileSearch, ListTree, ShieldCheck } from "lucide-react";
import { Message } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import ImageDisplay from "./ImageDisplay";
import VideoDisplay from "./VideoDisplay";
import MediaAttachment from "./MediaAttachment";

interface MessageBubbleProps {
  message: Message;
  index: number;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  isSpeaking: boolean;
  /** Optional handler for proposed actions (e.g. workspace mode runs open_url in-pane). */
  onExecuteProposedAction?: (action: NonNullable<Message["proposedActions"]>[number]) => void;
}

// ── Safe internet media detection ──────────────────────────────────────────────
// Markdown image/link URLs and direct public media URLs are rendered inline.
const MARKDOWN_MEDIA_URL_REGEX = /(!?)\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/gi;
const RAW_MEDIA_URL_REGEX = /(?:https?:\/\/[^\s<>"'\])}]+|data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+)/gi;
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "webm", "ogv", "mov"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "tif", "tiff"]);
const IMAGE_HOSTS = new Set([
  "images.unsplash.com", "i.imgur.com", "i.redd.it", "preview.redd.it",
  "media.giphy.com", "images.giphy.com", "media.tenor.com", "images.pexels.com",
  "cdn.pixabay.com", "lh3.googleusercontent.com", "pbs.twimg.com", "upload.wikimedia.org",
  "raw.githubusercontent.com", "cdn.discordapp.com", "images.ctfassets.net",
  "res.cloudinary.com", "images.prismic.io", "imagedelivery.net",
]);

type MediaKind = "image" | "video" | "embed";
interface ParsedMedia {
  type: MediaKind;
  src: string;
  openUrl: string;
  alt: string;
  position: number;
  length: number;
}

function isHostOrSubdomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith("." + domain);
}

function resolveMediaUrl(value: string, explicitImage = false, explicitVideo = false): Pick<ParsedMedia, "type" | "src" | "openUrl"> | null {
  if (/^data:image\//i.test(value)) return { type: "image", src: value, openUrl: value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;

  const hostname = url.hostname.toLowerCase();
  const openUrl = url.toString();
  const youtubeHost = isHostOrSubdomain(hostname, "youtube.com") || isHostOrSubdomain(hostname, "youtube-nocookie.com") || hostname === "youtu.be";
  if (youtubeHost) {
    let videoId = "";
    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") || "";
    } else {
      videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})(?:\/|$)/)?.[1] || "";
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return { type: "embed", src: "https://www.youtube-nocookie.com/embed/" + videoId, openUrl };
    }
  }

  if (isHostOrSubdomain(hostname, "vimeo.com")) {
    const videoId = url.pathname.match(/(?:^|\/)(?:video\/)?([0-9]{6,})(?:\/|$)/)?.[1];
    if (videoId) return { type: "embed", src: "https://player.vimeo.com/video/" + videoId, openUrl };
  }

  const extension = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
  const contentHint = [url.searchParams.get("mime"), url.searchParams.get("type"), url.searchParams.get("format"), url.searchParams.get("fm")]
    .filter(Boolean).join(" ").toLowerCase();
  const hintedVideo = /video\//.test(contentHint) || /\b(mp4|m4v|webm|ogv|mov)\b/.test(contentHint);
  if (VIDEO_EXTENSIONS.has(extension) || hintedVideo || explicitVideo) {
    return { type: "video", src: openUrl, openUrl };
  }

  const hintedImage = /image\//.test(contentHint) || /\b(jpg|jpeg|png|gif|webp|svg|bmp|avif|tif|tiff)\b/.test(contentHint);
  const isKnownImageHost = Array.from(IMAGE_HOSTS).some((domain) => isHostOrSubdomain(hostname, domain));
  if (IMAGE_EXTENSIONS.has(extension) || hintedImage || isKnownImageHost || explicitImage) {
    return { type: "image", src: openUrl, openUrl };
  }
  return null;
}

function extractMediaFromText(text: string): ParsedMedia[] {
  const media: ParsedMedia[] = [];
  const markdownRanges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  MARKDOWN_MEDIA_URL_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_MEDIA_URL_REGEX.exec(text)) !== null) {
    markdownRanges.push({ start: match.index, end: match.index + match[0].length });
    const alt = match[2] || "";
    const resolved = resolveMediaUrl(match[3], match[1] === "!", /\b(video|watch|clip|movie)\b/i.test(alt));
    if (resolved) {
      media.push({ ...resolved, alt: alt || (resolved.type === "image" ? "Internet image" : "Internet video"), position: match.index, length: match[0].length });
    }
  }

  RAW_MEDIA_URL_REGEX.lastIndex = 0;
  while ((match = RAW_MEDIA_URL_REGEX.exec(text)) !== null) {
    if (markdownRanges.some((range) => match!.index >= range.start && match!.index < range.end)) continue;
    const source = match[0].replace(/[.,!?;:]+$/, "");
    const resolved = resolveMediaUrl(source);
    if (resolved && !media.some((item) => item.position === match!.index)) {
      media.push({ ...resolved, alt: resolved.type === "image" ? "Internet image" : "Internet video", position: match.index, length: source.length });
    }
  }

  return media.sort((a, b) => a.position - b.position);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/[\x60]{3}([\s\S]*?)[\x60]{3}/g, '<pre><code>$1</code></pre>')
    .replace(/[\x60]([^\x60]+)[\x60]/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupol]|<pre|<code)(.+)$/gm, (match) => match.startsWith('<') ? match : '<p>' + match + '</p>');
}

function renderContentWithMedia(text: string, _accentColor: string) {
  const media = extractMediaFromText(text);
  if (media.length === 0) {
    return <div className="prose-crimson text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
  }

  const segments: Array<{ type: "text"; content: string } | { type: "media"; item: ParsedMedia }> = [];
  let lastEnd = 0;
  for (const item of media) {
    if (item.position > lastEnd) {
      const before = text.slice(lastEnd, item.position);
      if (before.trim()) segments.push({ type: "text", content: before });
    }
    segments.push({ type: "media", item });
    lastEnd = item.position + item.length;
  }
  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd);
    if (remaining.trim()) segments.push({ type: "text", content: remaining });
  }

  return (
    <div className="flex flex-col gap-2">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <div key={index} className="prose-crimson text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(segment.content) }} />;
        }
        if (segment.item.type === "image") {
          return <ImageDisplay key={index} src={segment.item.src} alt={segment.item.alt} />;
        }
        return <VideoDisplay key={index} src={segment.item.src} openUrl={segment.item.openUrl} title={segment.item.alt} embedded={segment.item.type === "embed"} />;
      })}
    </div>
  );
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

// ENOSX is thinking... indicator
function ThinkingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
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
      <motion.span
        className="text-xs italic tracking-wide"
        style={{ color }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        ENOSX is thinking<span className="thinking-pulse">...</span>
      </motion.span>
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
  onExecuteProposedAction,
}: MessageBubbleProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
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

  const handleProposedAction = async (action: NonNullable<Message["proposedActions"]>[number]) => {
    // Workspace / split-screen mode runs actions in-pane instead of opening new tabs.
    if (onExecuteProposedAction) {
      onExecuteProposedAction(action);
      return;
    }
    if (action.type === "open_url" && action.url) {
      try {
        const url = new URL(action.url);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported link");
        window.open(url.toString(), "_blank", "noopener,noreferrer");
        setActionStatus("Opened in a new tab.");
      } catch {
        setActionStatus("This proposed link is not a valid public URL.");
      }
      return;
    }
    if ((action.type === "read_webpage" || action.type === "extract_links") && action.url) {
      setActionStatus("Reading website…");
      try {
        const response = await fetch("/api/browser/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Web reading request failed");
        setActionStatus(action.type === "read_webpage" ? `Read: ${payload.title || action.url}` : `Found ${payload.links?.length ?? 0} links.`);
      } catch (error) {
        setActionStatus(error instanceof Error ? error.message : "Unable to complete web reading request.");
      }
      return;
    }
    if (action.url) {
      window.open(action.url, "_blank", "noopener,noreferrer");
      setActionStatus("Opened for your review. No website changes were made.");
      return;
    }
    setActionStatus("This proposal needs a configured desktop or browser provider.");
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
                  {/* User attachments — preview images, music, video, or downloadable files */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {message.attachments.map((att) => <MediaAttachment key={att.id} attachment={att} />)}
                    </div>
                  )}
                  <div
                    className="text-sm leading-relaxed"
                    style={{ color: config.text }}
                  >
                    {renderContentWithMedia(message.content, config.accent)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Assistant media attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {message.attachments.map((att) => <MediaAttachment key={att.id} attachment={att} />)}
                    </div>
                  )}
                  {/* Assistant content with inline image support */}
                  {renderContentWithMedia(message.content, config.accent)}
                  {message.proposedActions && message.proposedActions.length > 0 && (
                    <div className="flex flex-col gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.06] p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-cyan-100">
                        <ShieldCheck size={15} className="text-cyan-300" />
                        Proposed actions — review before running
                      </div>
                      {message.proposedActions.map((action, actionIndex) => {
                        const readOnly = action.type === "read_webpage" || action.type === "extract_links";
                        const isLink = action.type === "open_url";
                        const label = action.type === "open_url"
                          ? "Open link"
                          : action.type === "read_webpage"
                            ? "Read webpage"
                            : action.type === "extract_links"
                              ? "Extract links"
                              : action.type === "launch_app"
                                ? `Launch ${action.app || "app"}`
                                : "Review interaction";
                        const Icon = isLink ? ExternalLink : readOnly ? (action.type === "extract_links" ? ListTree : FileSearch) : ShieldCheck;
                        return (
                          <button
                            key={`${action.type}-${actionIndex}`}
                            onClick={() => void handleProposedAction(action)}
                            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-white/90 transition-colors hover:bg-white/10"
                          >
                            <span className="min-w-0 truncate">{label}{action.url ? ` · ${action.url}` : ""}</span>
                            <Icon size={15} className="shrink-0 text-cyan-300" />
                          </button>
                        );
                      })}
                      {actionStatus && <p className="text-[11px] leading-relaxed text-cyan-100/70">{actionStatus}</p>}
                    </div>
                  )}
                  {isGeneratingImage && (
                    <ImageGeneratingIndicator accent={config.accent} />
                  )}
                </div>
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
                  onClick={() => handleDownload('md')}
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
