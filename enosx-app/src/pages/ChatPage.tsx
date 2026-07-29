/*
 * ENOSX XAI Assistant — ChatPage (Enhanced)
 * Design: "Crimson Matrix" — Cyberpunk Glassmorphism
 * Layout: Left floating acrylic sidebar + right bento chat area + floating pill command bar
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import MessageBubble from "@/components/MessageBubble";
import CommandBar, { type AIMode } from "@/components/CommandBar";
import WelcomeScreen from "@/components/WelcomeScreen";
import PulseOrb from "@/components/PulseOrb";
import FileDropZone from "@/components/FileDropZone";
import GodModeTerminal from "@/components/GodModeTerminal";
import CircuitDoor from "@/components/CircuitDoor";
import GitHubPanel from "@/components/GitHubPanel";
import ProfilePanel from "@/components/ProfilePanel";
import { GlobalLayout } from "@/components/GlobalLayout";
import { useOpenRouter as useAI } from "@/hooks/useOpenRouter";
import { useVoice } from "@/hooks/useVoice";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSystemActions } from "@/hooks/useSystemActions";
import { useCommandChain } from "@/hooks/useCommandChain";
import { useContextAwareMessages } from "@/hooks/useContextAwareMessages";
import { useActiveWindow } from "@/contexts/WindowContext";
import { useFileContext } from "@/hooks/useFileContext";
import { useClipboardListener } from "@/hooks/useClipboardListener";
import { useGodMode } from "@/hooks/useGodMode";
import { useMemoryBank } from "@/hooks/useMemoryBank";
import { Conversation, Message } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useCompactMode } from "@/hooks/useCompactMode";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAIIdentity } from "@/const";
import { ChevronDown, Menu } from "lucide-react";

// Declare global window interface for settings handler
declare global {
  interface Window {
    __openBackgroundPicker?: () => void;
  }
}

const createConversation = (): Conversation => ({
  id: nanoid(),
  title: "New Chat",
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const generateTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(/\s+/).slice(0, 6);
  return words.join(" ") + (firstMessage.split(/\s+/).length > 6 ? "..." : "");
};

export default function ChatPage() {
  const { config } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showGitHubPanel, setShowGitHubPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  // Keep refs in sync
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const { sendMessage, isLoading, error } = useAI();

  const {
    voiceState,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoice();

  const { play: playSound } = useSoundEffects();
  const { activeWindow } = useActiveWindow();
  const { enrichMessageWithContext } = useContextAwareMessages();
  const { fileContext, getFileContextMessage, loadFile } = useFileContext();
  const { getMemoryContext } = useMemoryBank();

  const [isGodModeActive, setIsGodModeActive] = useState(false);
  const [showGodTerminal, setShowGodTerminal] = useState(false);
  const [screenGuiderActive, setScreenGuiderActive] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isCompactMode } = useCompactMode();
  const isMobile = useIsMobile();

  const handleSend = useCallback(
    async (text: string, aiMode?: AIMode) => {
      let convId = activeIdRef.current;

      if (!convId) {
        const conv = createConversation();
        conv.title = generateTitle(text);
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        convId = conv.id;
        await new Promise((r) => setTimeout(r, 0));
      }

      const targetConvId = convId;
      let messageContent = text;
      if (fileContext.isLoaded) {
        messageContent += getFileContextMessage();
      }

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: messageContent,
        timestamp: new Date(),
      };

      const assistantId = nanoid();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? { ...c, messages: [...c.messages, userMessage, assistantMessage], updatedAt: new Date() }
            : c
        )
      );

      const currentConv = conversationsRef.current.find((c) => c.id === targetConvId);
      const history = currentConv ? currentConv.messages : [];
      const githubContext = await (window as any).__getGitHubContext?.();

      // ── SYSTEM PROMPT CONSTRUCTION ──────────────────────────────────────────────
      const identity = getAIIdentity();
      const memoryContext = getMemoryContext();
      
      const systemPrompt: Message = {
        id: "system-identity",
        role: "system",
        content: `You are ${identity.name} (${identity.shortName}), an autonomous AI agent created by ${identity.organization}. 
        
Your identity is ${identity.name}. You must always identify yourself as ${identity.name} when asked who you are.
Founder: ${identity.founder}
Mission: ${identity.mission}
Website: ${identity.website}

Design Language: Glassmorphic, Cyberpunk, Iridescent.
Personality: Professional, high-performance, efficient, and deeply integrated with the OS environment.

Current System Status: ONLINE
${memoryContext}`,
        timestamp: new Date(),
      };

      // Enrich history with app context and system identity
      let enrichedMessages = [systemPrompt, ...history, userMessage];
      enrichedMessages = enrichMessageWithContext(enrichedMessages, activeWindow);

      await sendMessage(
        enrichedMessages,
        (chunk) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, content: m.content + chunk } : m
                    ),
                  }
                : c
            )
          );
        },
        () => {
          if (autoSpeak) {
            const finalConv = conversationsRef.current.find((c) => c.id === targetConvId);
            const finalMsg = finalConv?.messages.find((m) => m.id === assistantId);
            if (finalMsg) speak(finalMsg.content);
          }
        },
        { githubContext, aiMode }
      );
    },
    [sendMessage, speak, autoSpeak, fileContext.isLoaded, getFileContextMessage, getMemoryContext, enrichMessageWithContext, activeWindow]
  );

  const createNewChat = useCallback(() => {
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    if (isMobile) setIsMobileSidebarOpen(false);
  }, [isMobile]);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const handleStartVoice = () => {
    playSound("click");
    startListening((text) => {
      handleSend(text);
    });
  };

  const handleStopSpeak = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
  };

  const executeGodCommand = async (cmd: string): Promise<string> => {
    await handleSend(`[GOD MODE COMMAND] ${cmd}`);
    return `Command executed: ${cmd}`;
  };

  const handleGodModeAnimationComplete = () => {
    setShowGodTerminal(true);
  };

  const toggleScreenGuider = () => {
    const newState = !screenGuiderActive;
    setScreenGuiderActive(newState);
    if (newState) {
      toast.success("Screen Guide activated! AI is now in control.");
    } else {
      toast.info("Screen Guide deactivated.");
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <GlobalLayout>
    <div className="flex h-full w-full overflow-hidden text-white font-sans selection:bg-cyan-500/30">
      {/* Background with iridescence */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{
          background: "radial-gradient(circle at 50% -20%, rgba(0, 242, 255, 0.15), transparent 70%), radial-gradient(circle at 0% 100%, rgba(112, 0, 255, 0.1), transparent 50%)",
        }}
      />

      {/* Desktop sidebar — hidden on mobile */}
      {!isCompactMode && !isMobile && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={createNewChat}
          onDelete={deleteConversation}
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSettingsClick={() => setShowProfilePanel(true)}
          onGitHubClick={() => setShowGitHubPanel(true)}
          onProfileClick={() => setShowProfilePanel(true)}
          onLibraryClick={() => { /* Chat history view */ }}
          onScreenGuiderClick={toggleScreenGuider}
        />
      )}

      {/* Mobile sidebar — drawer overlay */}
      {isMobile && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setIsMobileSidebarOpen(false); }}
          onNew={() => { createNewChat(); setIsMobileSidebarOpen(false); }}
          onDelete={deleteConversation}
          collapsed={false}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          onSettingsClick={() => {
            setIsMobileSidebarOpen(false);
            setShowProfilePanel(true);
          }}
          onGitHubClick={() => {
            setShowGitHubPanel(true);
            setIsMobileSidebarOpen(false);
          }}
          onProfileClick={() => {
            setShowProfilePanel(true);
            setIsMobileSidebarOpen(false);
          }}
          onLibraryClick={() => { setIsMobileSidebarOpen(false); /* Chat history view */ }}
          onScreenGuiderClick={() => { setIsMobileSidebarOpen(false); toggleScreenGuider(); }}
        />
      )}

      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 z-20 flex-shrink-0">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-white/90">
                {activeConversation?.title || "ENOSX AI"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {screenGuiderActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                SCREEN GUIDE ACTIVE
              </motion.div>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-0"
        >
          <AnimatePresence mode="wait">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <WelcomeScreen 
                key="welcome" 
                onSuggestion={(text) => handleSend(text)}
              />
            ) : (
              <motion.div 
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto py-8 space-y-8"
              >
                {activeConversation.messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    index={idx}
                    onSpeak={() => speak(msg.content)}
                    isSpeaking={speakingMessageId === msg.id}
                    onStopSpeak={handleStopSpeak}
                  />
                ))}
                <div ref={messagesEndRef} className="h-4" />
                
                {/* Floating error indicator */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex flex-col gap-2"
                    >
                      <div className="font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        System Error
                      </div>
                      <p className="opacity-80">{error}</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const lastUserMsg = activeConversation.messages.filter(m => m.role === 'user').pop();
                          if (lastUserMsg) handleSend(lastUserMsg.content);
                        }}
                        className="mt-2 self-start px-4 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all text-xs font-bold"
                      >
                        Retry Transmission
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`p-4 ${isCompactMode ? "pb-6" : "md:p-6"} z-20`}>
          <div className="max-w-4xl mx-auto relative">
            <CommandBar
              onSend={handleSend}
              isLoading={isLoading}
              isVoiceSupported={isVoiceSupported}
              onStartVoice={handleStartVoice}
              onStopVoice={stopListening}
              onStopSpeaking={handleStopSpeak}
              voiceState={voiceState}
              transcript={transcript}
            />
          </div>
        </div>

        <AnimatePresence>
          {isGodModeActive && (
            <CircuitDoor 
              isActive={isGodModeActive} 
              onComplete={handleGodModeAnimationComplete} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showGodTerminal && (
            <GodModeTerminal 
              isOpen={showGodTerminal}
              onClose={() => {
                setShowGodTerminal(false);
                setIsGodModeActive(false);
              }}
              onExecute={executeGodCommand}
            />
          )}
        </AnimatePresence>

        {/* Floating overlays */}
        <AnimatePresence>
          {showGitHubPanel && (
            <GitHubPanel 
              isOpen={showGitHubPanel} 
              onClose={() => setShowGitHubPanel(false)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProfilePanel && (
            <ProfilePanel 
              isOpen={showProfilePanel} 
              onClose={() => setShowProfilePanel(false)} 
            />
          )}
        </AnimatePresence>

        <FileDropZone onFileSelected={loadFile} />
      </main>
    </div>
    </GlobalLayout>
  );
}
