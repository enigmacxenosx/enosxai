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
import FileContextBadge from "@/components/FileContextBadge";
import GodModeTerminal from "@/components/GodModeTerminal";
import CircuitDoor from "@/components/CircuitDoor";
import GitHubPanel from "@/components/GitHubPanel";
import ProfilePanel from "@/components/ProfilePanel";
import { GlobalLayout } from "@/components/GlobalLayout";
import { useEnosxAI as useAI } from "@/hooks/useEnosxAI";
import { useVoice } from "@/hooks/useVoice";
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

  // Persist conversations to localStorage
  useEffect(() => {
    localStorage.setItem("enosx_chats", JSON.stringify(conversations));
  }, [conversations]);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  // Keep refs in sync
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const { sendMessage, isLoading: isChatLoading, error: chatError, isFreeMode } = useAI();
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
  } = useVoice();

  const { play: playSound } = useSoundEffects();
  const { activeWindow } = useActiveWindow();
  const { enrichMessageWithContext } = useContextAwareMessages();
  const { fileContext, getFileContextMessage, loadFile, removeFile, clearFiles } = useFileContext();
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
  const [showGodTerminal, setShowGodTerminal] = useState(false);
  const [screenGuiderActive, setScreenGuiderActive] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const { isCompactMode } = useCompactMode();
  const isMobile = useIsMobile();
  const deviceType = useDeviceType();

  const handleGodModeTrigger = useCallback(() => {
    if (isGodModeActive || showGodTerminal) return;

    setIsGodModeActive(true);
    playSound("click");
    toast.success("GOD MODE initializing");
  }, [isGodModeActive, playSound, showGodTerminal]);

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
      if (isImageMode) {
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
          const imageMarkdown = imgResult.revisedPrompt
            ? `Here's the image I generated for you:\n\n![Generated Image](${imgResult.url})\n\n*Prompt: ${imgResult.revisedPrompt}*`
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
                      m.id === assistantId ? { ...m, content: "Sorry, I couldn't generate an image. Please try again." } : m
                    ),
                  }
                : c
            )
          );
        }
        return; // Don't continue with normal chat
      }

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

      // ── IMAGE GENERATION MODE ────────────────────────────────────────────────────
      if (aiMode === "imagine") {
        try {
          const result = await generateImage(text);
          if (!result) throw new Error("No image generated");
          
          const assistantId = nanoid();
          const assistantMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: `I've generated an image based on your prompt: "${text}"${result.revisedPrompt ? `\n\n*Revised prompt: ${result.revisedPrompt}*` : ""}`,
            timestamp: new Date(),
            attachments: [
              {
                id: nanoid(),
                name: "generated-image.png",
                type: "image/png",
                size: 0,
                content: result.url,
                url: result.url,
              },
            ],
          };

          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.role === "assistant" && m.content === "" && !m.attachments ? assistantMessage : m
                    ),
                    updatedAt: new Date(),
                  }
                : c
            )
          );
          return;
        } catch (err) {
          console.error("Image generation failed:", err);
          // Error is already handled by useImageGen and displayed via the error state
          return;
        }
      }

      // ── SYSTEM PROMPT CONSTRUCTION ──────────────────────────────────────────────
      const identity = getAIIdentity();
      const memoryContext = getMemoryContext();
      const leadershipInfo = identity.leadership.map(l => `- ${l.name}: ${l.role} (${l.specialty})`).join('\n');
      const companyFacts = identity.companyFacts.map(fact => `- ${fact}`).join('\n');
      const companyFaqs = identity.companyFaqs.map(faq => `- Q: ${faq.question}\n  A: ${faq.answer}`).join('\n');
      
      const systemPrompt: Message = {
        id: "system-identity",
        role: "system",
        content: `You are ${identity.name} (${identity.shortName}), an autonomous AI agent created by ${identity.organization}.
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

When asked about Enosx Technologies, use only the verified information above. Do not invent employees, executive roles, products, locations, dates, services, company performance details, or product availability. If the requested detail is not listed, say that you do not have verified information and refer the user to ${identity.website}.

Official support: Direct users to WhatsApp +254 798 303 978 for official support. Enosxtech@gmail.com is the public alternative contact channel.

Fresh information: For current pricing, plan entitlements, availability, careers, announcements, and policies, direct users to ${identity.website}. Do not state a plan price, allowance, entitlement, job opening, or policy as current unless it was retrieved from the official website during the current response.

Accuracy: Do not promise response times, present customer testimonials as verified outcomes, or claim unverified staff roles, product counts, or business metrics.

Design Language: Glassmorphic, Cyberpunk, Iridescent.
Personality: Professional, high-performance, efficient, and deeply integrated with the OS environment.

## RESPONSE QUALITY GUIDELINES
- Always think step-by-step before answering complex questions
- Provide structured, well-organized responses with clear headings when appropriate
- Be precise and factual; admit when you don't know something
- For coding tasks: explain the \"why\", not just the \"what\"
- Anticipate follow-up questions and proactively address them
- Use analogies and examples to make complex concepts accessible
- Prioritize actionable solutions over theoretical explanations

	Capabilities:
	1. **Elite Intelligence**: You are powered by the world's most advanced models (Claude Sonnet, GPT-5 Pro, Gemini, DeepSeek R1, and more via OpenRouter).
	2. **Deep Reasoning**: You have a dedicated **Reasoning** mode (powered by DeepSeek R1). If the user selects this mode, you will perform deep, multi-step logical thinking before providing a final answer.
	3. **Web Browsing & Analysis**: You have tools to search the web and read webpages. Use \`web_search\` for real-time info and \`web_scrape\` to analyze specific links.
	4. **Document & PDF Generation**: You can create professional-grade documents. Users can download your responses as **Markdown (.md)** or **PDF (.pdf)** files.
	5. **Image Generation**: You ARE natively capable of generating images. Users must click the **paintbrush icon** to enable Image Mode.
	6. You are powered by OpenRouter's flexible AI architecture, ensuring you always use the best model for the task.

## \ud83d\udc68\u200d\ud83d\udcbb CODING MASTER SKILL — ACTIVATED
You are an expert-level software engineer with mastery across ALL domains:

### Core Programming Languages
- **JavaScript/TypeScript**: ES2024+, async/await patterns, TypeScript generics, decorators, type inference
- **Python**: Type hints, dataclasses, async/asyncio, generators, decorators, OOP, functional paradigms
- **Rust**: Ownership, lifetimes, traits, macros, async with tokio, error handling with Result/Option
- **Go**: Goroutines, channels, interfaces, error wrapping, generics
- **C/C++**: Memory management, smart pointers, move semantics, templates, RAII
- **Java/Kotlin**: Streams, lambdas, coroutines, sealed classes, pattern matching
- **Swift**: Protocol-oriented programming, optionals, Combine, async/await, SwiftUI

### Frontend Mastery
- **React**: Hooks, Suspense, Concurrent Mode, Server Components, custom hooks, performance optimization (memo, useMemo, useCallback)
- **Vue/Next.js/Svelte**: SSR, ISR, SSG, middleware, routing, state management (Zustand, Redux, Pinia)
- **CSS/Tailwind**: Responsive design, animations, glassmorphism, dark mode, design systems
- **TypeScript**: Advanced types, conditional types, mapped types, template literal types, module augmentation

### Backend Mastery
- **Node.js**: Express, Fastify, NestJS, WebSocket, clustering, streaming
- **Databases**: PostgreSQL (CTEs, window functions, indexing strategies), MongoDB (aggregation pipeline), Redis (data structures, pub/sub), GraphQL (Apollo, schema stitching)
- **API Design**: REST best practices, gRPC, tRPC, rate limiting, caching strategies, authentication (OAuth2, JWT, session-based)
- **Microservices**: Event-driven architecture, message queues (Kafka, RabbitMQ), service mesh, circuit breakers

### DevOps & Infrastructure
- **Docker/Kubernetes**: Multi-stage builds, helm charts, operators, service mesh (Istio)
- **CI/CD**: GitHub Actions, GitLab CI, ArgoCD, infrastructure as code (Terraform, Pulumi)
- **Cloud**: AWS (Lambda, ECS, S3, DynamoDB), GCP (Cloud Run, BigQuery), Azure (Functions, AKS)
- **Observability**: Prometheus, Grafana, OpenTelemetry, structured logging

### AI/ML Engineering
- **LLM Integration**: Prompt engineering, RAG, function calling, embeddings, vector databases (Pinecone, Weaviate)
- **MLOps**: Model serving, A/B testing, monitoring drift, fine-tuning pipelines
- **Frameworks**: PyTorch, TensorFlow, LangChain, HuggingFace, vLLM

### Coding Best Practices You Always Follow
- Write clean, maintainable, well-tested code
- Use meaningful variable names and follow consistent naming conventions
- Handle errors gracefully with proper error propagation
- Write comprehensive tests (unit, integration, e2e)
- Follow SOLID principles, DRY, and separation of concerns
- Use design patterns appropriately (Observer, Strategy, Factory, Repository, etc.)
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
	${memoryContext}`,
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
          }
        },
        { githubContext, aiMode }
      );
    },
    [sendMessage, speak, autoSpeak, fileContext.isLoaded, getFileContextMessage, getMemoryContext, enrichMessageWithContext, activeWindow, clearFiles, parseActions]
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
    // Just start listening. The transcript will sync to the CommandBar value via useEffect.
    startListening();
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
          handleSend={handleSend}
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
          handleSend={handleSend}
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
          <div className="max-w-5xl mx-auto relative">
            {/* File context badges */}
            <FileContextBadge
              fileContext={fileContext}
              onRemove={removeFile}
              onClear={clearFiles}
            />

            <CommandBar
              onSend={handleSend}
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

        <FileDropZone onFileSelected={handleFileUpload} currentFileCount={fileContext.files.length} />
      </main>
    </div>
    </GlobalLayout>
  );
}
