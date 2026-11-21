/*
 * ENOSX AI — MessageBubble
 * Unboxed animated messages with streaming text, markdown, voice playback,
 * and inline image display for both user attachments and AI-generated images.
 * Features: fade-in spring, streaming cursor, copy, speak,
 * document download, image lightbox.
 */

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, ExternalLink, FileSearch, ListTree, ShieldCheck, Film, GitBranch, Star, CheckCircle2, CircleAlert, Clock3, Loader2, XCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { Message, type ActionActivityStatus } from "@/lib/types";
import { getMessageFeedback, submitMessageFeedback, type MessageFeedbackRating } from "@/lib/feedback";
import type { FollowUpSuggestion } from "@/lib/followUpSuggestions";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { isImageUrl, resolveMediaUrl, type ResolvedMediaKind } from "@/lib/mediaUrls";
import ImageDisplay from "./ImageDisplay";
import AudioDisplay from "./AudioDisplay";
import VideoDisplay from "./VideoDisplay";
import MediaAttachmentList from "./MediaAttachmentList";

interface MessageBubbleProps {
  message: Message;
  index: number;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  isSpeaking: boolean;
  onRedoResponse?: (messageId: string) => void;
  /** Optional handler for proposed actions (e.g. workspace mode runs open_url in-pane). */
  onExecuteProposedAction?: (action: NonNullable<Message["proposedActions"]>[number], messageId: string) => void;
  onActionActivity?: (messageId: string, activityId: string, label: string, status: ActionActivityStatus, detail: string) => void;
  onBranchFromHere?: (messageId: string) => void;
  branchDisabled?: boolean;
  followUpPrompts?: FollowUpSuggestion[];
  onFollowUp?: (prompt: string) => void;
}

// ── Safe internet media detection ──────────────────────────────────────────────
// Markdown image/link URLs and direct public media URLs are rendered inline.
const MARKDOWN_MEDIA_URL_REGEX = /(!?)\[([^\]]*)\]\(((?:https?:\/\/|data:(?:image|video|audio)\/)[^\s)]+)\)/gi;
const RAW_MEDIA_URL_REGEX = /(?:https?:\/\/[^\s<>"'\])}]+|data:(?:image|video|audio)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+)/gi;
interface ParsedMedia {
  type: ResolvedMediaKind;
  src: string;
  openUrl: string;
  alt: string;
  position: number;
  length: number;
  embedded?: boolean;
}

function extractMediaFromText(text: string): ParsedMedia[] {
  const media: ParsedMedia[] = [];
  const markdownRanges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  MARKDOWN_MEDIA_URL_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_MEDIA_URL_REGEX.exec(text)) !== null) {
    markdownRanges.push({ start: match.index, end: match.index + match[0].length });
    const alt = match[2] || "";
    const resolved = resolveMediaUrl(match[3], match[1] === "!", /\b(video|watch|clip|movie)\b/i.test(alt), /\b(audio|music|track|song|podcast)\b/i.test(alt));
    if (resolved) {
      media.push({ ...resolved, alt: alt || (resolved.type === "image" ? "Internet image" : resolved.type === "audio" ? "Internet audio" : "Internet video"), position: match.index, length: match[0].length });
    }
  }

  RAW_MEDIA_URL_REGEX.lastIndex = 0;
  while ((match = RAW_MEDIA_URL_REGEX.exec(text)) !== null) {
    if (markdownRanges.some((range) => match!.index >= range.start && match!.index < range.end)) continue;
    const source = match[0].replace(/[.,!?;:]+$/, "");
    const resolved = resolveMediaUrl(source);
    if (resolved && !media.some((item) => item.position === match!.index)) {
      media.push({ ...resolved, alt: resolved.type === "image" ? "Internet image" : resolved.type === "audio" ? "Internet audio" : "Internet video", position: match.index, length: source.length });
    }
  }

  return media.sort((a, b) => a.position - b.position);
}

function renderMarkdown(text: string, isStreaming = false) {
  return (
    <Streamdown className="prose-crimson" mode={isStreaming ? "streaming" : "static"} isAnimating={isStreaming}>
      {text}
    </Streamdown>
  );
}

function renderContentWithMedia(text: string, _accentColor: string, isStreaming = false) {
  const media = extractMediaFromText(text);
  if (media.length === 0) {
    return renderMarkdown(text, isStreaming);
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
          return <div key={index}>{renderMarkdown(segment.content, isStreaming)}</div>;
        }
        if (segment.item.type === "image") {
          return <ImageDisplay key={index} src={segment.item.src} alt={segment.item.alt} watermark={/^generated image$/i.test(segment.item.alt)} />;
        }
        if (segment.item.type === "audio") {
          return <AudioDisplay key={index} src={segment.item.src} openUrl={segment.item.openUrl} title={segment.item.alt} embedded={segment.item.embedded} />;
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

// Image generation loading state for assistant
function ImageGeneratingIndicator({ accent, isVideo = false }: { accent: string; isVideo?: boolean }) {
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
      {isVideo && <Film size={14} style={{ color: accent }} />}
      <span className="text-xs" style={{ color: accent, opacity: 0.6 }}>
        Generating {isVideo ? "video" : "image"}...
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
  onRedoResponse,
  onExecuteProposedAction,
  onActionActivity,
  onBranchFromHere,
  branchDisabled,
  followUpPrompts,
  onFollowUp,
}: MessageBubbleProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isActivityVisible, setIsActivityVisible] = useState(Boolean(message.actionActivities?.length));
  const [rating, setRating] = useState<MessageFeedbackRating | null>(() => getMessageFeedback(message.id)?.rating ?? null);
  const [hoverRating, setHoverRating] = useState<MessageFeedbackRating | null>(null);
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;
  const isEmpty = !message.content?.trim() && isStreaming;
  const actionActivities = isUser ? [] : message.actionActivities ?? [];
  const latestActivity = actionActivities.reduce((latest, activity) => {
    if (!latest) return activity;
    const latestTime = Date.parse(latest.updatedAt || "");
    const activityTime = Date.parse(activity.updatedAt || "");
    return Number.isFinite(activityTime) && (!Number.isFinite(latestTime) || activityTime >= latestTime) ? activity : latest;
  }, actionActivities[0]);
  const activeActivity = actionActivities.reduce((latest, activity) => {
    if (activity.status !== "running" && activity.status !== "waiting_for_approval") return latest;
    if (!latest) return activity;
    return Date.parse(activity.updatedAt || "") >= Date.parse(latest.updatedAt || "") ? activity : latest;
  }, undefined as (typeof actionActivities)[number] | undefined);
  const visibleActivity = activeActivity || latestActivity;
  const activityIcon = visibleActivity?.status === "running" ? Loader2
    : visibleActivity?.status === "waiting_for_approval" ? Clock3
      : visibleActivity?.status === "succeeded" ? CheckCircle2
        : visibleActivity?.status === "cancelled" ? XCircle : CircleAlert;
  const activityText = visibleActivity?.detail?.trim()
    || (visibleActivity?.status === "failed" ? `${visibleActivity.label} failed.` : visibleActivity?.status === "succeeded" ? `${visibleActivity.label} completed.` : visibleActivity?.label || "Working…");
  const githubDiagnosticTrace = !isUser && message.reasoningSteps?.length ? (
    <details className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.02] text-xs text-white/65">
      <summary className="cursor-pointer px-3 py-2 transition-colors hover:text-white/90">
        GitHub CI check · {message.reasoningSteps.length} steps
      </summary>
      <ol className="list-decimal space-y-1 px-8 pb-3 leading-relaxed">
        {message.reasoningSteps.map((step, stepIndex) => <li key={`${stepIndex}-${step}`}>{step}</li>)}
      </ol>
    </details>
  ) : null;
  const actionActivityTimeline = (
    <AnimatePresence initial={false}>
      {visibleActivity && isActivityVisible && <motion.div
        key={visibleActivity.id + visibleActivity.updatedAt}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.2 }}
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 py-0.5 text-[11px] leading-relaxed text-white/55"
      >
        {(() => {
          const Icon = activityIcon;
          return <Icon size={12} className={`shrink-0 ${visibleActivity.status === "running" ? "animate-spin text-cyan-200" : visibleActivity.status === "succeeded" ? "text-emerald-300" : visibleActivity.status === "failed" ? "text-rose-300" : "text-amber-200"}`} />;
        })()}
        <span>{activityText}</span>
      </motion.div>}
    </AnimatePresence>
  );

  // Check for an active image or video generation request.
  const isGeneratingMedia = !isUser && (message.content.includes("🖼️") || message.content.includes("🎬")) && isStreaming;
  const isGeneratingVideo = message.content.includes("🎬");

  useEffect(() => {
    setRating(getMessageFeedback(message.id)?.rating ?? null);
    setHoverRating(null);
  }, [message.id]);

  useEffect(() => {
    if (!actionActivities.length) {
      setIsActivityVisible(false);
      return;
    }
    setIsActivityVisible(true);
    if (actionActivities.some((activity) => activity.status === "running" || activity.status === "waiting_for_approval")) return;
    const timeout = window.setTimeout(() => setIsActivityVisible(false), 2_400);
    return () => window.clearTimeout(timeout);
  }, [actionActivities, message.id]);

  const rateResponse = (value: MessageFeedbackRating) => {
    const record = submitMessageFeedback(message.id, value);
    setRating(record.rating);
  };

  const handleProposedAction = async (action: NonNullable<Message["proposedActions"]>[number]) => {
    const activityId = crypto.randomUUID().replace(/-/g, "");
    const reportActivity = (label: string, status: ActionActivityStatus, detail: string) => {
      onActionActivity?.(message.id, activityId, label, status, detail);
    };
    // Interactions are queued for the extension and require a second, per-action
    // approval in its popup on the matching target page.
    if (onExecuteProposedAction && (action.type === "click_element" || action.type === "fill_form")) {
      onExecuteProposedAction(action, message.id);
      return;
    }
    if (action.type === "open_url" && action.url) {
      const label = "Open proposed link";
      reportActivity(label, "running", "Opening the proposed public link in a new tab.");
      try {
        const url = new URL(action.url);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported link");
        const opened = window.open(url.toString(), "_blank", "noopener,noreferrer");
        if (!opened) throw new Error("The browser blocked the new tab.");
        reportActivity(label, "succeeded", "Opened the link in a new tab.");
        setActionStatus("Opened in a new tab.");
      } catch (error) {
        reportActivity(label, "failed", error instanceof Error ? error.message : "This proposed link is not a valid public URL.");
        setActionStatus("This proposed link is not a valid public URL.");
      }
      return;
    }
    if ((action.type === "read_webpage" || action.type === "extract_links") && action.url) {
      const label = action.type === "read_webpage" ? "Read proposed webpage" : "Extract webpage links";
      reportActivity(label, "running", `Requesting ${action.url}`);
      setActionStatus("Reading website…");
      try {
        const response = await fetch("/api/browser/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Web reading request failed");
        const detail = action.type === "read_webpage" ? `Read: ${payload.title || action.url}` : `Found ${payload.links?.length ?? 0} links.`;
        reportActivity(label, "succeeded", detail);
        setActionStatus(detail);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unable to complete web reading request.";
        reportActivity(label, "failed", detail);
        setActionStatus(detail);
      }
      return;
    }
    if (action.url) {
      const label = action.type === "launch_app" ? `Open ${action.app || "app"}` : "Open proposed target";
      reportActivity(label, "running", "Opening the target for your review; no website change will be made.");
      try {
        const url = new URL(action.url);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only public HTTP(S) links are supported.");
        const opened = window.open(url.toString(), "_blank", "noopener,noreferrer");
        if (!opened) throw new Error("The browser blocked the new tab.");
        reportActivity(label, "succeeded", "Opened for your review. No website changes were made.");
        setActionStatus("Opened for your review. No website changes were made.");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "The target could not be opened.";
        reportActivity(label, "failed", detail);
        setActionStatus(detail);
      }
      return;
    }
    reportActivity("Review proposed action", "failed", "This proposal needs a configured desktop or browser provider.");
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
      className={`flex min-w-0 gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Flat message surface: sent text is intentionally unboxed; media keeps its own controls. */}
      <div className={`flex min-w-0 max-w-[92%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <motion.div
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`relative w-full transition-all duration-300 ${!isUser && (isEmpty || isStreaming) ? 'rainbow-glow' : ''}`}
          style={{
            background: "transparent",
            border: "0",
            borderRadius: 0,
            boxShadow: "none",
            padding: isEmpty ? "4px 0" : "0",
            maxWidth: "100%",
            overflowWrap: "anywhere",
          }}
        >
          {isEmpty ? (
            <div className="flex flex-col gap-2">
              <span className="sr-only" role="status">{message.reasoningStatus || "Analyzing your request…"}</span>
              {githubDiagnosticTrace}
              {actionActivityTimeline}
            </div>
          ) : (
            <div className="relative">
              {isUser ? (
                <div className="flex flex-col gap-3">
                  {/* User attachments — images are grouped into one browsable collection */}
                  {message.attachments && message.attachments.length > 0 && (
                    <MediaAttachmentList attachments={message.attachments} />
                  )}
                  <div
                    className="text-[15px] leading-7"
                    style={{ color: config.text }}
                  >
                    {renderContentWithMedia(message.content, config.accent)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Assistant media attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <MediaAttachmentList attachments={message.attachments} />
                  )}
                  {/* Assistant content with inline image support */}
                  {renderContentWithMedia(message.content, config.accent, isStreaming)}
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
                                : action.type === "click_element" || action.type === "fill_form"
                                  ? "Queue for browser review"
                                  : "Review interaction";
                        const Icon = isLink ? ExternalLink : readOnly ? (action.type === "extract_links" ? ListTree : FileSearch) : ShieldCheck;
                        const videoMedia = isLink && action.url ? resolveMediaUrl(action.url) : null;
                        const imageUrl = isLink && action.url && isImageUrl(action.url) ? action.url : undefined;
                        return (
                          <div key={`${action.type}-${actionIndex}`} className="flex flex-col gap-2">
                            {imageUrl && (
                              <ImageDisplay
                                src={imageUrl}
                                alt="Image shared by ENOSX AI"
                              />
                            )}
                            {videoMedia && videoMedia.type !== "image" && (
                              <VideoDisplay
                                src={videoMedia.src}
                                openUrl={videoMedia.openUrl}
                                title="Video shared by ENOSX AI"
                                embedded={videoMedia.type === "embed"}
                              />
                            )}
                            <button
                              onClick={() => void handleProposedAction(action)}
                              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-white/90 transition-colors hover:bg-white/10"
                            >
                              <span className="min-w-0 truncate">{imageUrl ? "Open image in a new tab" : videoMedia ? "Open video in a new tab" : label}{action.url ? ` · ${action.url}` : ""}</span>
                              <Icon size={15} className="shrink-0 text-cyan-300" />
                            </button>
                          </div>
                        );
                      })}
                      {actionStatus && <p className="text-[11px] leading-relaxed text-cyan-100/70">{actionStatus}</p>}
                    </div>
                  )}
                  {isGeneratingMedia && (
                    <ImageGeneratingIndicator accent={config.accent} isVideo={isGeneratingVideo} />
                  )}
                  {githubDiagnosticTrace}
                  {actionActivityTimeline}
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
          <>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            {!isUser && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(message.content))}
                  className="flex items-center justify-center p-0.5 transition-colors duration-150"
                  style={{
                    color: isSpeaking ? config.accent : config.textMuted,
                  }}
                  title={isSpeaking ? "Stop speaking" : "Speak"}
                >
                  {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRedoResponse?.(message.id)}
                  className="flex items-center justify-center p-0.5 text-white/45 transition-colors duration-150 hover:text-white/80"
                  style={{
                    color: config.textMuted,
                  }}
                  title="Redo response"
                  aria-label="Redo response"
                >
                  <RotateCcw size={12} />
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
          </>
        )}

        {!isUser && !isStreaming && message.content.trim() && (
          <div className="mt-2 flex w-full flex-col gap-2">
            <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" aria-label="Agent response actions">
              <span style={{ color: config.textMuted }}>How was this result?</span>
              <div className="flex items-center gap-0.5" role="group" aria-label="Rate this response from 1 to 5 stars" onMouseLeave={() => setHoverRating(null)}>
                {([1, 2, 3, 4, 5] as const).map((value) => {
                  const active = value <= (hoverRating ?? rating ?? 0);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => rateResponse(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onFocus={() => setHoverRating(value)}
                      onBlur={() => setHoverRating(null)}
                      aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                      aria-pressed={rating === value}
                      title={`Rate ${value} out of 5 stars`}
                      className="rounded-sm p-0.5 transition-colors hover:text-amber-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-300"
                      style={{ color: active ? "#fbbf24" : config.textMuted }}
                    >
                      <Star size={14} fill={active ? "currentColor" : "none"} />
                    </button>
                  );
                })}
              </div>
              {rating && <span className="text-[10px]" style={{ color: config.textMuted }} role="status">Thanks for rating this response.</span>}
              {onBranchFromHere && (
                <button
                  type="button"
                  onClick={() => onBranchFromHere(message.id)}
                  disabled={branchDisabled}
                  aria-label="Branch conversation from this reply"
                  title="Start a new chat from this reply"
                  className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ color: config.textMuted }}
                >
                  <GitBranch size={13} />
                  <span className="sr-only">Branch from here</span>
                </button>
              )}
            </div>

            {followUpPrompts && followUpPrompts.length > 0 && onFollowUp && (
              <div className="flex flex-col gap-1.5" aria-label="Suggested next prompts">
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: config.textMuted }}>Continue with</span>
                <div className="flex flex-wrap gap-1.5">
                  {followUpPrompts.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => onFollowUp(suggestion.text)}
                      className="rounded-full border px-2.5 py-1.5 text-left text-[11px] leading-4 transition-colors hover:bg-white/[0.06]"
                      style={{ borderColor: `rgba(${config.accentRgb}, 0.24)`, color: config.text }}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
