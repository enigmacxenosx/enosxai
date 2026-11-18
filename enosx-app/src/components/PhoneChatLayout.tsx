import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import MessageBubble from "./MessageBubble";
import CommandBar, { AIModePicker, type AIMode } from "./CommandBar";
import { WelcomeSuggestions } from "./WelcomeScreen";
import BrandMark from "./BrandMark";
import { Conversation, Message, VoiceState, type Attachment } from "@/lib/types";

interface PhoneChatLayoutProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createNewChat: () => void;
  deleteConversation: (id: string) => void;
  messages: Message[];
  isLoading: boolean;
  handleSend: (text: string, aiMode?: AIMode) => void;
  aiMode: AIMode;
  onAiModeChange: (mode: AIMode) => void;
  waitingCount?: number;
  voiceState: VoiceState;
  transcript: string;
  isVoiceSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isFreeMode?: boolean;
  onFilesSelected?: (files: File[]) => void;
  attachments?: Attachment[];
  audioStream?: MediaStream | null;
  onSettingsClick?: () => void;
  userDisplayName?: string;
  totalTokensUsed?: number;
}

export default function PhoneChatLayout({
  conversations,
  activeId,
  setActiveId,
  createNewChat,
  deleteConversation,
  messages,
  isLoading,
  handleSend,
  aiMode,
  onAiModeChange,
  waitingCount = 0,
  voiceState,
  transcript,
  isVoiceSupported,
  startListening,
  stopListening,
  speak,
  stopSpeaking,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  messagesEndRef,
  isFreeMode = false,
  onFilesSelected,
  attachments = [],
  audioStream = null,
  onSettingsClick,
  userDisplayName,
  totalTokensUsed = 0,
}: PhoneChatLayoutProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(true);

  React.useEffect(() => {
    if (messages.length === 0) setShowSuggestions(true);
  }, [messages.length]);

  return (
    <div className="phone-reference-shell flex h-full w-full flex-col overflow-hidden">
      {/* Reference-style mobile header */}
      <header className="phone-reference-header z-20 flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="phone-reference-menu touch-manipulation"
          aria-label="Open conversations"
        >
          <Menu size={22} strokeWidth={1.7} />
        </button>
        <div className="phone-reference-brand min-w-0">
          <BrandMark size={28} className="shrink-0" />
          <span className="truncate">ENOSX AI</span>
        </div>
        <AIModePicker
          aiMode={aiMode}
          onChange={onAiModeChange}
          className="phone-reference-mode shrink-0"
        />
        <div
          className="phone-reference-tokens shrink-0"
          role="status"
          aria-label={`${totalTokensUsed.toLocaleString()} tokens used`}
        >
          <Gauge size={13} strokeWidth={1.7} />
          <strong>{totalTokensUsed.toLocaleString()}</strong>
          <span>tokens</span>
        </div>
      </header>

      {/* Main content area */}
      <main className="phone-reference-main relative z-10 min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        {messages.length === 0 ? (
          <div className="phone-reference-welcome">
            <div className="phone-reference-hero">
              <BrandMark size={46} />
              <h1>What would you like to work on?</h1>
            </div>
            {showSuggestions && (
              <section className="phone-reference-suggestions" aria-label="Suggested for you">
                <div className="phone-reference-suggestions__heading">
                  <h2>Suggested for you</h2>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="phone-reference-suggestions__close"
                    aria-label="Hide suggested prompts"
                  >
                    <X size={18} strokeWidth={1.7} />
                  </button>
                </div>
                <WelcomeSuggestions
                  onSuggestion={(p: string) => handleSend(p)}
                  variant="list"
                  animateEntrance={false}
                />
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-4 py-4 pb-32">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                index={idx}
                onSpeak={speak}
                onStopSpeak={stopSpeaking}
                isSpeaking={voiceState === "speaking"}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Mobile command bar */}
      <div className="phone-reference-composer-dock relative z-30 shrink-0">
        <CommandBar
          onSend={handleSend}
          aiMode={aiMode}
          isLoading={isLoading}
          waitingCount={waitingCount}
          voiceState={voiceState}
          transcript={transcript}
          isVoiceSupported={isVoiceSupported}
          onStartVoice={startListening}
          onStopVoice={stopListening}
          onStopSpeaking={stopSpeaking}
          isFreeMode={isFreeMode}
          onFilesSelected={onFilesSelected}
          attachments={attachments}
          audioStream={audioStream}
          tightBottom={messages.length === 0}
          animateEntrance={messages.length > 0}
          userDisplayName={userDisplayName}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-[80%] max-w-[300px] border-r border-white/10 bg-[#0c0c10]"
            >
              <Sidebar
                conversations={conversations}
                activeId={activeId}
                onSelect={(id) => { setActiveId(id); setIsMobileSidebarOpen(false); }}
                onNew={() => { createNewChat(); setIsMobileSidebarOpen(false); }}
                onDelete={deleteConversation}
                collapsed={false}
                isMobileOpen={true}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
                onSettingsClick={() => {
                  setIsMobileSidebarOpen(false);
                  onSettingsClick?.();
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
