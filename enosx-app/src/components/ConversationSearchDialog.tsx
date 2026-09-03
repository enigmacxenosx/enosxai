/*
 * ENOSX AI — ConversationSearchDialog
 * Full-text search across all stored conversations. Selecting a match jumps
 * to that conversation; matches are shown with a content snippet.
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, MessageSquare, X } from "lucide-react";
import { ConversationSearchMatch } from "@/hooks/useConversationSearch";
import { Conversation } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

interface ConversationSearchDialogProps {
  isOpen: boolean;
  query: string;
  setQuery: (value: string) => void;
  results: ConversationSearchMatch[];
  conversations: Conversation[];
  onClose: () => void;
  onSelect: (conversationId: string) => void;
  onOpenLeadCapture?: () => void;
}

export default function ConversationSearchDialog({
  isOpen,
  query,
  setQuery,
  results,
  conversations,
  onClose,
  onSelect,
  onOpenLeadCapture,
}: ConversationSearchDialogProps) {
  const { config } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay so the framer exit animation of other panels completes
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "rgba(10, 12, 18, 0.92)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search size={16} className="text-white/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all conversations…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {query.trim().length < 2 && (
            <div className="px-4 py-6">
              <p className="text-xs text-white/40 mb-3">
                {conversations.length > 0
                  ? "Select a conversation or search across your history."
                  : "No saved conversations yet. Start a new chat to see it here."}
              </p>
              {conversations.length > 0 && (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        onSelect(conversation.id);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <MessageSquare size={14} className="shrink-0" style={{ color: config.accent }} />
                      <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                        {conversation.title || "New Chat"}
                      </span>
                      <span className="shrink-0 text-[10px] text-white/35">
                        {conversation.messages.length} {conversation.messages.length === 1 ? "message" : "messages"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {onOpenLeadCapture && (
                <p className="text-center text-xs text-white/50 mt-4">
                  Or{" "}
                  <button
                    onClick={() => {
                      onOpenLeadCapture();
                      onClose();
                    }}
                    className="underline hover:text-white transition-colors"
                  >
                    leave your details for a follow-up
                  </button>
                  {" "}if you would like someone to reach you.
                </p>
              )}
            </div>
          )}

          {query.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-white/40">
              No conversations match “{query.trim()}”.
            </p>
          )}

          {results.map((match, index) => (
            <button
              key={`${match.conversationId}-${match.messageIndex}-${index}`}
              onClick={() => {
                onSelect(match.conversationId);
                onClose();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors"
            >
              <MessageSquare size={14} className="mt-0.5 shrink-0" style={{ color: config.accent }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-white/70 truncate">
                  <span className="font-medium truncate">{match.conversationTitle}</span>
                  <span className="text-white/30 shrink-0">{match.timestamp}</span>
                </div>
                <p className="text-sm text-white/80 break-words">{match.snippet}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
