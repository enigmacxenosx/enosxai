/*
 * ENOSX AI — WorkspaceChatPane
 * Manus-style left pane: conversation thread + command bar.
 * The AI's [[ACTION: ...]] commands visibly drive the Enosx Computer
 * workspace pane on the right via the injected onExecuteAction hook.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useEnosxAI as useAI } from "@/hooks/useEnosxAI";
import { useVoice } from "@/hooks/useVoice";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { getSystemPrompt } from "@/lib/prompts";
import { getAIIdentity } from "@/const";
import CommandBar, { type AIMode } from "@/components/CommandBar";
import MessageBubble from "@/components/MessageBubble";
import type { Conversation, Message, AssistantAction } from "@/lib/types";
import type { SystemAction } from "@/hooks/useCommandChain";

const ACTION_BLOCK = /\[\[ACTION:\s*({[\s\S]*?})\s*\]\]/g;

function removeActionBlocks(content: string) {
  return content.replace(ACTION_BLOCK, "").replace(/\n{3,}/g, "\n\n").trim();
}

function parseSystemActions(text: string): SystemAction[] {
  const actions: SystemAction[] = [];
  const regex = /\[\[ACTION:\s*({.*?})\s*\]\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const action = JSON.parse(match[1]) as SystemAction;
      if (
        ["open_url", "launch_app", "read_webpage", "extract_links", "click_element", "fill_form", "chain", "delay", "create_script", "run_script"].includes(action.type)
      ) {
        actions.push(action);
      }
    } catch {
      /* ignore malformed blocks */
    }
  }
  return actions;
}

interface WorkspaceChatPaneProps {
  onExecuteAction?: (actions: SystemAction[]) => void;
  isThinkingIndicator?: boolean;
}

export default function WorkspaceChatPane({ onExecuteAction }: WorkspaceChatPaneProps) {
  const { config } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const [conversation, setConversation] = useState<Conversation>({
    id: "workspace-chat",
    title: "Enosx Workspace",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const { sendMessage, isLoading: isChatLoading, error: chatError } = useAI();
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

  const messages = conversation.messages;
  const isLoading = isChatLoading;
  const error = chatError;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (text: string, aiMode?: AIMode) => {
      if (sendingRef.current) return;
      sendingRef.current = true;
      try {
        const identity = getAIIdentity();
        const systemPrompt: Message = {
          id: "system-workspace",
          role: "system",
          content: `${getSystemPrompt("balanced")}

### Enosx Technologies - Verified Information
Founder & CEO: ${identity.founder}
Mission: ${identity.mission}
Website: ${identity.website}

### Workspace Mode Directives
You are running inside the ENOSX WORKSPACE, a Manus-style split-screen environment. The right pane shows the live Enosx Computer workspace (browser, files, GitHub windows).
When you want to open a webpage, read content, open an app in the workspace, or chain actions, respond with action blocks embedded in your answer:
[[ACTION: {"type": "open_url", "url": "https://example.com"}]]
[[ACTION: {"type": "read_webpage", "url": "https://example.com"}]]
[[ACTION: {"type": "launch_app", "app": "browser"}]]
[[ACTION: {"type": "extract_links", "url": "https://example.com"}]]
[[ACTION: {"type": "chain", "sequence": [{"type": "read_webpage", "url": "https://example.com"}, {"type": "open_url", "url": "https://example.com/next"}]}]]

### Script Creation & Execution
You can write and run scripts that appear live in the Script Console (terminal window) of the computer pane. Python (.py) runs for REAL in the browser using WebAssembly. Shell (.sh) and batch (.bat) scripts run in a labeled simulation that produces realistic output. To do this:
1. Create the script: [[ACTION: {"type": "create_script", "name": "hello.py", "language": "python", "content": "print('Hello from Enosx AI!')\nprint(2 + 2)"}]]
   language can be "python", "shell", or "batch". Keep scripts short and self-contained. Python supports standard library basics: print, math, lists, dicts, loops, functions, string formatting.
2. Run it: [[ACTION: {"type": "run_script", "name": "hello.py"}]]
3. Open the console so the user can watch: [[ACTION: {"type": "launch_app", "app": "terminal"}]]
Always explain what the script does and describe the expected output before running it.
Explain what you are doing as you go, so the user can watch the actions execute live in the computer pane.
Current System Status: ONLINE`,
          timestamp: new Date(),
        };

        const userMessage: Message = {
          id: `u-${Date.now()}`,
          role: "user",
          content: text,
          timestamp: new Date(),
        };
        const assistantId = `a-${Date.now()}`;
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        setConversation((prev) => ({
          ...prev,
          title: prev.messages.length === 0 ? text.slice(0, 42) + (text.length > 42 ? "..." : "") : prev.title,
          messages: [...prev.messages, userMessage, assistantMessage],
          updatedAt: new Date(),
        }));

        let streamed = "";
        await sendMessage(
          [systemPrompt, ...conversation.messages, userMessage],
          (chunk) => {
            streamed += chunk;
            setConversation((prev) => ({
              ...prev,
              messages: prev.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            }));
          },
          () => {
            const actions = parseSystemActions(streamed);
            const clean = removeActionBlocks(streamed);
            setConversation((prev) => ({
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: clean,
                      proposedActions: actions.length ? (actions as unknown as AssistantAction[]) : undefined,
                    }
                  : m,
              ),
              updatedAt: new Date(),
            }));
            if (actions.length > 0 && onExecuteAction) {
              toast.info(`ENOSX is executing ${actions.length} action(s) in the computer pane...`);
              onExecuteAction(actions);
            }
          },
          { aiMode }
        );
      } finally {
        sendingRef.current = false;
      }
    },
    [sendMessage, conversation.messages, onExecuteAction]
  );

  const handleStartVoice = () => {
    playSound("click");
    startListening(undefined, undefined);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-white">
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b px-4" style={{ borderColor: `rgba(${config.accentRgb},0.14)`, background: "rgba(6,8,14,0.5)" }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black" style={{ color: config.accent, background: `rgba(${config.accentRgb},0.14)` }}>EX</span>
          <div>
            <p className="text-xs font-bold tracking-wide text-white/90">ENOSX AI</p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Chat · workspace mode</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-200/70">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" /> Online
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl font-black" style={{ borderColor: `rgba(${config.accentRgb},0.3)`, color: config.accent, background: `rgba(${config.accentRgb},0.08)` }}>EX</div>
            <div>
              <p className="text-sm font-semibold text-white/85">ENOSX AI is ready.</p>
              <p className="mt-1 max-w-xs text-xs text-white/45">Ask anything — actions like opening pages appear live in the computer pane on the right.</p>
            </div>
            <div className="mt-2 grid w-full max-w-sm grid-cols-1 gap-2">
              {[
                "What's happening in tech today?",
                "Read https://example.com and tell me what it says",
                "Open the Enosx blog",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => void handleSend(suggestion)}
                  className="rounded-xl border px-3 py-2 text-left text-xs text-white/65 transition hover:bg-white/5"
                  style={{ borderColor: `rgba(${config.accentRgb},0.15)` }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                index={idx}
                onSpeak={() => speak(msg.content)}
                isSpeaking={false}
                onStopSpeak={() => stopSpeaking()}
                onExecuteProposedAction={(action) => void onExecuteAction?.([action])}
              />
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 pl-12 text-xs italic" style={{ color: config.accent }}>
                ENOSX is thinking<span className="thinking-pulse">...</span>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                {error}
                <button
                  onClick={() => {
                    const last = messages.filter((m) => m.role === "user").pop();
                    if (last) void handleSend(last.content);
                  }}
                  className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/15 px-3 py-1 text-[10px] font-bold hover:bg-amber-500/25"
                >
                  Retry
                </button>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t px-3 py-3" style={{ borderColor: `rgba(${config.accentRgb},0.12)`, background: "rgba(6,8,14,0.35)" }}>
        <CommandBar
          onSend={handleSend}
          isLoading={isLoading}
          isVoiceSupported={isVoiceSupported}
          onStartVoice={handleStartVoice}
          onStopVoice={stopListening}
          onStopSpeaking={stopSpeaking}
          voiceState={voiceState}
          transcript={transcript}
          isFreeMode={false}
        />
      </div>
    </div>
  );
}
