import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Plus } from "lucide-react";
import Sidebar from "./Sidebar";
import MessageBubble from "./MessageBubble";
import CommandBar, { type AIMode } from "./CommandBar";
import WelcomeScreen from "./WelcomeScreen";
import { Conversation, Message, VoiceState } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

interface PhoneChatLayoutProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createNewChat: () => void;
  deleteConversation: (id: string) => void;
  messages: Message[];
  isLoading: boolean;
  handleSend: (text: string, aiMode?: AIMode) => void;
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
  onSettingsClick?: () => void;
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
  onSettingsClick,
}: PhoneChatLayoutProps) {
  const { config } = useTheme();

  return (
    <div className="flex flex-col h-full w-full relative bg-black overflow-hidden">
      {/* Mobile Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/10 z-20 bg-black/50 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="min-h-11 min-w-11 p-2 -ml-2 text-white/70 hover:text-white transition-colors touch-manipulation"
        >
          <Menu size={24} />
        </button>
        <div className="text-sm font-bold tracking-tighter text-white/90">
          ENOSX <span className="text-cyan-400">AI</span>
        </div>
        <button
          type="button"
          onClick={createNewChat}
          className="min-h-11 min-w-11 p-2 -mr-2 text-white/70 hover:text-white transition-colors touch-manipulation"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto relative z-10 px-4 py-4 scrollbar-hide">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={(p: string) => handleSend(p)} />
        ) : (
          <div className="flex flex-col gap-6 pb-32">
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

      {/* Mobile Command Bar */}
      <div className="phone-composer-dock relative z-30 shrink-0 border-t border-white/10 bg-black/80 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <CommandBar
          onSend={handleSend}
          isLoading={isLoading}
          voiceState={voiceState}
          transcript={transcript}
          isVoiceSupported={isVoiceSupported}
          onStartVoice={startListening}
          onStopVoice={stopListening}
          onStopSpeaking={stopSpeaking}
          isFreeMode={isFreeMode}
          onFilesSelected={onFilesSelected}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] z-50 bg-[#0c0c10] border-r border-white/10"
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
