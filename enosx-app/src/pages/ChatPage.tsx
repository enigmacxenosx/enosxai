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
import ConversationSearchDialog from "@/components/ConversationSearchDialog";
import FileDropZone from "@/components/FileDropZone";
import FileContextBadge from "@/components/FileContextBadge";
import GodModeTerminal from "@/components/GodModeTerminal";
import GodModeSecurityBanner from "@/components/GodModeSecurityBanner";
import EthicalHackingQuiz from "@/components/EthicalHackingQuiz";
import CircuitDoor from "@/components/CircuitDoor";
import GitHubPanel from "@/components/GitHubPanel";
import ProfilePanel from "@/components/ProfilePanel";
import { GlobalLayout } from "@/components/GlobalLayout";
import { useEnosxAI as useAI } from "@/hooks/useEnosxAI";
import { useVoice } from "@/hooks/useVoice";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useConversationSearch } from "@/hooks/useConversationSearch";
import { useAdminConsole } from "@/hooks/useAdminConsole";
import { useAuth } from "@/contexts/AuthContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSystemActions } from "@/hooks/useSystemActions";
import { useContextAwareMessages } from "@/hooks/useContextAwareMessages";
import { useActiveWindow } from "@/contexts/WindowContext";
import { useFileContext } from "@/hooks/useFileContext";
import { useClipboardListener } from "@/hooks/useClipboardListener";
import { useGodMode } from "@/hooks/useGodMode";
import { useMemoryBank } from "@/hooks/useMemoryBank";
import { AssistantAction, Conversation, Message } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useCompactMode } from "@/hooks/useCompactMode";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import PhoneChatLayout from "@/components/PhoneChatLayout";
import TVChatLayout from "@/components/TVChatLayout";
import { getAIIdentity } from "@/const";
import { getSystemPrompt } from "@/lib/prompts";
import { CONNECTOR_CATALOG } from "@/lib/connectorCatalog";
import LeadCaptureDialog from "@/components/LeadCaptureDialog";
import AdminConsoleDialog from "@/components/AdminConsoleDialog";
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

const ACTION_BLOCK = /\[\[ACTION:\s*({[\s\S]*?})\s*\]\]/g;

function removeActionBlocks(content: string) {
  return content.replace(ACTION_BLOCK, "").replace(/\n{3,}/g, "\n\n").trim();
}

export default function ChatPage() {
  const { config } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem("enosx_chats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
      } catch (e) {
        console.error("Failed to load chats", e);
      }
    }
    return [];
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem("enosx_active_chat");
  });
  const [activeMode, setActiveMode] = useState<AIMode>("ex");
  const { user, isAuthenticated } = useAuth();

  // Persist conversations to localStorage and Neon
  useEffect(() => {
    localStorage.setItem("enosx_chats", JSON.stringify(conversations));
    
    // Sync to backend if authenticated
    if (isAuthenticated && user?.id) {
      const syncHistory = async () => {
        try {
          // Sync all conversations (debounced or on change)
          for (const conv of conversations) {
            await fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, chat: conv }),
            });
          }
        } catch (err) {
          console.error("Failed to sync history to Neon:", err);
        }
      };
      syncHistory();
    }
  }, [conversations, isAuthenticated, user?.id]);

  // Load history from Neon on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const loadHistory = async () => {
        try {
          const res = await fetch(`/api/history?userId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.history && data.history.length > 0) {
              setConversations(data.history);
            }
          }
        } catch (err) {
          console.error("Failed to load history from Neon:", err);
        }
      };
      loadHistory();
    }
  }, [isAuthenticated, user?.id]);

  // Persist activeId to localStorage
  useEffect(() => {
    if (activeId) {
      localStorage.setItem("enosx_active_chat", activeId);
    } else {
      localStorage.removeItem("enosx_active_chat");
    }
  }, [activeId]);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showGitHubPanel, setShowGitHubPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  // Prevent double submission (e.g. rapid Enter presses) from adding the same
  // prompt twice to the conversation.
  const sendingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const { sendMessage, isLoading: isChatLoading, isThinking, error: chatError, isFreeMode } = useAI();
  const { generateImage, isGenerating, error: imageError } = useImageGeneration();
  const isLoading = isChatLoading || isGenerating;
  const error = chatError || imageError;

  const {
    voiceState,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    settings: speechSettings,
    updateSettings: updateSpeechSettings,
    scheduleListenAgain,
    onFinalResultRef,
  } = useVoice();

  const { recordOutgoingMessage, recordVoiceUsage, refreshFromConversations } = useAnalytics();
  const conversationSearch = useConversationSearch();
  const { getAdminContext } = useAdminConsole();

  // Track total messages/conversations for the usage dashboard
  useEffect(() => {
    refreshFromConversations(conversations);
  }, [conversations, refreshFromConversations]);

  const { play: playSound } = useSoundEffects();
  const { activeWindow } = useActiveWindow();
  const { enrichMessageWithContext } = useContextAwareMessages();
  const { fileContext, getFileContextMessage, clearFiles, loadFile, removeFile } = useFileContext();
  const { getMemoryContext } = useMemoryBank();
  const { parseActions } = useSystemActions();

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (fileContext.files.length >= 10) {
        toast.error("Maximum 10 files allowed");
        return;
      }

      const SUPPORTED_TEXT_TYPES = [
        "text/plain", "text/markdown", "application/json", "text/javascript", 
        "text/typescript", "text/x-python", "text/x-java", "text/x-c", 
        "text/x-cpp", "application/xml", "text/html", "text/css"
      ];
      const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const SUPPORTED_DOC_TYPES = [
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint", 
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ];

      const isText = SUPPORTED_TEXT_TYPES.includes(file.type) || file.name.match(/\.(txt|md|json|js|ts|py|java|c|cpp|xml|html|css)$/i);
      const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isDoc = SUPPORTED_DOC_TYPES.includes(file.type) || file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i);

      if (!isText && !isImage && !isDoc) {
        toast.error(`Unsupported file type: ${file.name.split(".").pop()}`);
        return;
      }

      const maxSize = isDoc ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large (max ${isDoc ? "10MB" : "5MB"})`);
        return;
      }

      try {
        let content = "";
        if (isText) {
          content = await file.text();
        } else {
          content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
        loadFile(file, content);
      } catch (error) {
        toast.error("Failed to read file");
      }
    },
    [fileContext.files.length, loadFile]
  );

  const [isGodModeActive, setIsGodModeActive] = useState(false);
  const [showGodModeWarning, setShowGodModeWarning] = useState(false);
  const [showGodTerminal, setShowGodTerminal] = useState(false);
  const [showEthicalHackingQuiz, setShowEthicalHackingQuiz] = useState(false);
  const [screenGuiderActive, setScreenGuiderActive] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const isImageModeRef = useRef(false);
  useEffect(() => { isImageModeRef.current = isImageMode; }, [isImageMode]);
  const { isCompactMode } = useCompactMode();
  const isMobile = useIsMobile();
  const deviceType = useDeviceType();

  const handleGodModeTrigger = useCallback(() => {
    if (isGodModeActive || showGodModeWarning || showGodTerminal) return;

    playSound("click");
    setShowGodModeWarning(true);
    toast.info("GOD MODE authorization notice required");
  }, [isGodModeActive, playSound, showGodModeWarning, showGodTerminal]);

  const acknowledgeGodModeWarning = useCallback(() => {
    setShowGodModeWarning(false);
    setIsGodModeActive(true);
    toast.success("Authorized lab mode confirmed — GOD MODE initializing");
  }, []);

  const cancelGodModeWarning = useCallback(() => {
    setShowGodModeWarning(false);
    toast.info("GOD MODE entry cancelled");
  }, []);

  useGodMode(handleGodModeTrigger);

  const handleToggleImageMode = useCallback(() => {
    setIsImageMode((prev) => {
      if (prev) {
        toast.info("Image mode disabled");
      } else {
        toast.success("Image mode enabled — your next message will generate an image");
      }
      return !prev;
    });
  }, []);

  const handleSend = useCallback(
    async (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]): Promise<string> => {
      // In-flight guard: ignore overlapping calls so a prompt is added exactly
      // once per user action.
      if (sendingRef.current) return "";
      sendingRef.current = true;
      try {
      if (aiMode) setActiveMode(aiMode);
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
        attachments: fileContext.isLoaded ? [...fileContext.files] : undefined,
      };

      // Clear files after sending
      clearFiles();

      const assistantId = nanoid();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      // ── Image generation mode ────────────────────────────────────────────────
      if (isImageModeRef.current) {
        setIsImageMode(false);
        // Show generating state
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? {
                  ...c,
                  messages: [...c.messages, userMessage, assistantMessage],
                  updatedAt: new Date(),
                }
              : c
          )
        );

        const imgResult = await generateImage(text);
        if (imgResult && imgResult.url) {
          const imageMarkdown = imgResult.revised_prompt
            ? `Here's the image I generated for you:\n\n![Generated Image](${imgResult.url})\n\n*Prompt: ${imgResult.revised_prompt}*`
            : `Here's the image I generated for you:\n\n![Generated Image](${imgResult.url})`;

          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, content: imageMarkdown } : m
                    ),
                  }
                : c
            )
          );
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, content: "Sorry, I couldn't generate that image. If you're on Free Mode, image generation requires top-up credits on OpenRouter. Please try again later." } : m
                    ),
                  }
                : c
            )
          );
        }
        return imgResult?.url ? "Image generated successfully." : "Image generation did not return an image."; // Don't continue with normal chat
      }

      const existingUserMessage = conversationsRef.current
        .find((c) => c.id === targetConvId)
        ?.messages.find((m) => m.role === "user" && m.content === userMessage.content);

      if (!existingUserMessage) {
        // Duplicate-message guard: if a user message with this exact content
        // already exists in the thread (e.g. a stray double-submit that raced
        // past the in-flight check), skip appending it again.
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? { ...c, messages: [...c.messages, userMessage, assistantMessage], updatedAt: new Date() }
              : c
          )
        );
      }

      const currentConv = conversationsRef.current.find((c) => c.id === targetConvId);
      const history = currentConv ? currentConv.messages : [];
      const githubContext = await (window as any).__getGitHubContext?.();
      const selectedConnectorNames = (selectedConnectorIds ?? [])
        .map((id) => CONNECTOR_CATALOG.find((connector) => connector.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      const connectorContext = selectedConnectorNames.length
        ? `### Selected Connectors\nThe user selected these connector services for this chat: ${selectedConnectorNames.join(", ")}. Treat them as requested context. Use a connector only when its capability is actually available to the runtime; if it is not connected, state that clearly instead of claiming an external action was completed.`
        : "";

// ── SYSTEM PROMPT CONSTRUCTION ──────────────────────────────────────────────
      const identity = getAIIdentity();
      const memoryContext = getMemoryContext();
      const leadershipInfo = identity.leadership.map(l => `- ${l.name}: ${l.role} (${l.specialty})`).join('\n');
      const companyFacts = identity.companyFacts.map(fact => `- ${fact}`).join('\n');
      const companyFaqs = identity.companyFaqs.map(faq => `- Q: ${faq.question}\n  A: ${faq.answer}`).join('\n');
      
            const systemPrompt: Message = {
        id: "system-identity",
        role: "system",
        content: `${getSystemPrompt(activeMode)}

### Enosx Technologies - Verified Information
Founder & CEO: ${identity.founder}
Mission: ${identity.mission}
Our Story: ${identity.story}
Founder's Vision: ${identity.founderVision}
Website: ${identity.website}

Leadership Team:
${leadershipInfo}

Verified Company Facts:
${companyFacts}

Verified Company FAQ:
${companyFaqs}

### Development Context
${githubContext}

${connectorContext}

### Operational Directives
- Optimize for readability first, then performance
- Add inline comments only where the code is non-obvious
- Always consider edge cases, security implications, and performance
- Provide working, complete code — not pseudocode or partial snippets
- When debugging: analyze the error, identify root cause, explain the fix, and prevent recurrence

### Code Review Standards
- Review for: correctness, performance, security, maintainability, testability
- Suggest improvements with specific examples
- Identify potential bugs before they occur
- Recommend appropriate abstractions and refactoring opportunities

Current System Status: ONLINE
${memoryContext}
${getAdminContext().trim() ? `
### Additional Context (administrator configured)
${getAdminContext()}` : ""}`,
        timestamp: new Date(),
      };


      // Enrich history with app context and system identity
      let enrichedMessages = [systemPrompt, ...history, userMessage];
      enrichedMessages = enrichMessageWithContext(enrichedMessages, activeWindow);

      let streamedContent = "";
      await sendMessage(
        enrichedMessages,
        (chunk) => {
          streamedContent += chunk;
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
          const proposedActions = parseActions(streamedContent) as AssistantAction[];
          const cleanContent = removeActionBlocks(streamedContent);
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === targetConvId
                ? {
                    ...conversation,
                    messages: conversation.messages.map((message) =>
                      message.id === assistantId
                        ? { ...message, content: cleanContent, proposedActions: proposedActions.length ? proposedActions : undefined }
                        : message,
                    ),
                  }
                : conversation,
            ),
          );
          if (autoSpeak) {
            speak(cleanContent);
            if (speechSettings.continuousConversation) {
              scheduleListenAgain((text) => {
                // Continuous conversation: send the captured speech as the next message.
                void handleSend(text);
              });
            }
          }
        },
        { githubContext, aiMode }
      );

      return removeActionBlocks(streamedContent) || "ENOSX Core returned an empty response.";
      } finally {
        // Release the guard even if something threw mid-flight.
        sendingRef.current = false;
      }
    },
    [sendMessage, speak, autoSpeak, fileContext.isLoaded, getFileContextMessage, getMemoryContext, enrichMessageWithContext, activeWindow, clearFiles, parseActions, speechSettings.continuousConversation, scheduleListenAgain]
  );

  const createNewChat = useCallback(() => {
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    if (isMobile) setIsMobileSidebarOpen(false);
  }, [isMobile]);

  // Record outgoing messages for the usage dashboard
  const handleSendTracked = useCallback(
    async (text: string, aiMode?: AIMode, selectedConnectorIds?: string[]): Promise<string> => {
      recordOutgoingMessage(text);
      return handleSend(text, aiMode, selectedConnectorIds);
    },
    [handleSend, recordOutgoingMessage]
  );

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const handleStartVoice = (event?: React.MouseEvent) => {
    playSound("click");
    recordVoiceUsage();
    // Just start listening. The transcript will sync to the CommandBar value via useEffect.
    startListening(undefined, undefined);
  };

  const handleStopSpeak = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
  };

  const executeGodCommand = async (cmd: string): Promise<string> => {
    return await handleSend(
      `[GOD MODE COMMAND]\nRespond as the Ethical Hacking Mentor. Keep the explanation within an authorized lab context, do not access real systems, and do not provide instructions for credential theft, disruption, or unauthorized access.\n\nCommand: ${cmd}`
    );
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
  const messages = activeConversation?.messages || [];

  if (deviceType === "tv") {
    return (
      <GlobalLayout>
        <TVChatLayout
          conversations={conversations}
          activeId={activeId}
          setActiveId={setActiveId}
          createNewChat={createNewChat}
          messages={messages}
          isLoading={isLoading}
          handleSend={handleSendTracked}
          voiceState={voiceState}
          transcript={transcript}
          isVoiceSupported={isVoiceSupported}
          startListening={handleStartVoice}
          stopListening={stopListening}
          speak={speak}
          stopSpeaking={handleStopSpeak}
          messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
          isImageMode={isImageMode}
          onToggleImageMode={handleToggleImageMode}
          isFreeMode={isFreeMode}
        />
      </GlobalLayout>
    );
  }

  if (deviceType === "phone") {
    return (
      <GlobalLayout>
        <PhoneChatLayout
          conversations={conversations}
          activeId={activeId}
          setActiveId={setActiveId}
          createNewChat={createNewChat}
          deleteConversation={deleteConversation}
          messages={messages}
          isLoading={isLoading}
          handleSend={handleSendTracked}
          voiceState={voiceState}
          transcript={transcript}
          isVoiceSupported={isVoiceSupported}
          startListening={handleStartVoice}
          stopListening={stopListening}
          speak={speak}
          stopSpeaking={handleStopSpeak}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
          isImageMode={isImageMode}
          onToggleImageMode={handleToggleImageMode}
          isFreeMode={isFreeMode}
        />
      </GlobalLayout>
    );
  }

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
          onLibraryClick={() => conversationSearch.open()}
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
          onLibraryClick={() => { setIsMobileSidebarOpen(false); conversationSearch.open(); }}
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
                onSuggestion={(text) => void handleSendTracked(text)}
              />
            ) : (
              <motion.div 
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-5xl mx-auto py-8 space-y-8"
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
                {/* In-message 'ENOSX is thinking...' indicator while the AI processes */}
                {isLoading && (
                  <motion.div
                    key="thinking-indicator"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-row gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: config.accent + "22", color: config.accent }}
                    >
                      EX
                    </div>
                    <div className="flex items-center gap-1 text-sm italic px-1">
                      <span style={{ color: config.accent }}>ENOSX is thinking</span>
                      <span style={{ color: config.accent }} className="thinking-pulse">...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-4" />
                
                {/* Floating error indicator */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-200 text-sm flex flex-col gap-2"
                    >
                      <div className="font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Connection issue
                      </div>
                      <p className="opacity-80">{error}</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const lastUserMsg = activeConversation.messages.filter(m => m.role === 'user').pop();
                          if (lastUserMsg) void handleSendTracked(lastUserMsg.content);
                        }}
                        className="mt-2 self-start px-4 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/25 transition-all text-xs font-bold"
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

        <div className={`px-4 pb-2 pt-3 ${isCompactMode ? "pb-4" : "md:px-6 md:pb-2 md:pt-4"} z-20`}>
          <div className="max-w-5xl mx-auto relative">
            {/* File context badges */}
            <FileContextBadge
              fileContext={fileContext}
              onRemove={removeFile}
              onClear={clearFiles}
            />

            <CommandBar
              onSend={handleSendTracked}
              isLoading={isLoading}
              isVoiceSupported={isVoiceSupported}
              onStartVoice={handleStartVoice}
              onStopVoice={stopListening}
              onStopSpeaking={handleStopSpeak}
              voiceState={voiceState}
              transcript={transcript}
              onFileSelect={handleFileUpload}
              isImageMode={isImageMode}
              onToggleImageMode={handleToggleImageMode}
              isFreeMode={isFreeMode}
            />
          </div>
        </div>

        <GodModeSecurityBanner
          isOpen={showGodModeWarning}
          onAcknowledge={acknowledgeGodModeWarning}
          onCancel={cancelGodModeWarning}
        />

        <ConversationSearchDialog
          isOpen={conversationSearch.isOpen}
          query={conversationSearch.query}
          setQuery={conversationSearch.setQuery}
          results={conversationSearch.results}
          onClose={conversationSearch.close}
          onSelect={(id) => {
            setActiveId(id);
            conversationSearch.close();
          }}
          onOpenLeadCapture={() => { conversationSearch.close(); setShowLeadCapture(true); }}
        />

        <LeadCaptureDialog
          isOpen={showLeadCapture}
          onClose={() => setShowLeadCapture(false)}
          transcript={activeConversation?.messages.map((m) => `${m.role === "user" ? "User" : "Enosx AI"}: ${m.content}`).join("\n\n") || ""}
          conversationTitle={activeConversation?.title || ""}
        />

        <AdminConsoleDialog
          isOpen={showAdminConsole}
          onClose={() => setShowAdminConsole(false)}
        />

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
                setShowEthicalHackingQuiz(false);
              }}
              onOpenQuiz={() => setShowEthicalHackingQuiz(true)}
              onExecute={executeGodCommand}
            />
          )}
        </AnimatePresence>

        <EthicalHackingQuiz
          isOpen={showEthicalHackingQuiz}
          onClose={() => setShowEthicalHackingQuiz(false)}
        />

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
              onOpenAdminConsole={() => setShowAdminConsole(true)}
              onOpenLeadCapture={() => setShowLeadCapture(true)}
            />
          )}
        </AnimatePresence>

        <FileDropZone onFileSelected={handleFileUpload} currentFileCount={fileContext.files.length} />
      </main>
    </div>
    </GlobalLayout>
  );
}
