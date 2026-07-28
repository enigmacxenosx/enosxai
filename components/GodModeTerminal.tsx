/*
 * ENOSX AI — GodModeTerminal
 * Advanced operator console for GOD MODE commands.
 * Features: custom command input, terminal history, repo-aware command dispatch,
 * and high-end cyberpunk styling.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldOff, Cpu } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "system" | "error";
  content: string;
  timestamp: Date;
}

interface GodModeTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: string) => Promise<string>;
}

export default function GodModeTerminal({ isOpen, onClose, onExecute }: GodModeTerminalProps) {
  const { config } = useTheme();
  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: "init",
      type: "system",
      content: "ENOSX OS [Version 2.0.00] - GOD CORE LOADED",
      timestamp: new Date(),
    },
    {
      id: "auth",
      type: "system",
      content: "OPERATOR: ENOSH (LEVEL 10 - GOD MODE DIRECT)",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isOpen]);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setHistory((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), type, content, timestamp: new Date() },
    ]);
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || isExecuting) return;

    setInput("");
    addLine("input", cmd);

    if (cmd.toLowerCase() === "clear") {
      setHistory([]);
      return;
    }

    if (cmd.toLowerCase() === "exit") {
      onClose();
      return;
    }

    setIsExecuting(true);
    try {
      const result = await onExecute(cmd);
      addLine("output", result);
    } catch (err) {
      addLine("error", `Error executing command: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 pointer-events-none"
        >
          <motion.div
            className="w-full max-w-5xl h-[80vh] rounded-2xl overflow-hidden border pointer-events-auto flex flex-col shadow-2xl"
            style={{
              background: "rgba(5, 5, 10, 0.92)",
              borderColor: "rgba(0, 242, 255, 0.3)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 40px rgba(0, 242, 255, 0.15), 0 20px 50px rgba(0,0,0,0.8)",
            }}
          >
            {/* Terminal Header */}
            <div 
              className="px-4 py-3 flex items-center justify-between border-b"
              style={{ borderColor: "rgba(0, 242, 255, 0.2)", background: "rgba(0, 242, 255, 0.05)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <ShieldOff size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase">
                    GOD MODE ROOT CONSOLE — ENOSH@ENOSX-CORE
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-md transition-colors"
                style={{ color: "rgba(0, 242, 255, 0.6)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Terminal Output */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0, 242, 255, 0.2) transparent" }}
            >
              {history.map((line) => (
                <div key={line.id} className="flex gap-3">
                  <span className="opacity-30 select-none">
                    [{line.timestamp.toLocaleTimeString([], { hour12: false })}]
                  </span>
                  <div className="flex-1 break-words">
                    {line.type === "input" && (
                      <span className="text-cyan-400 font-bold mr-2">enosh@enosx:~$</span>
                    )}
                    {line.type === "system" && (
                      <span className="text-yellow-400 font-bold">[SYS] </span>
                    )}
                    {line.type === "error" && (
                      <span className="text-red-500 font-bold">[ERR] </span>
                    )}
                    <span style={{ 
                      color: line.type === "input" ? "#fff" : 
                             line.type === "error" ? "#ef4444" : 
                             line.type === "system" ? "#fbbf24" : 
                             "rgba(0, 242, 255, 0.9)"
                    }}>
                      {line.content}
                    </span>
                  </div>
                </div>
              ))}
              {isExecuting && (
                <div className="flex gap-3 items-center">
                  <span className="opacity-30 select-none">
                    [{new Date().toLocaleTimeString([], { hour12: false })}]
                  </span>
                  <motion.div 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-cyan-400"
                  >
                    Executing GOD MODE command...
                  </motion.div>
                </div>
              )}
            </div>

            {/* Terminal Input */}
            <form 
              onSubmit={handleCommand}
              className="p-4 border-t flex items-center gap-3"
              style={{ borderColor: "rgba(0, 242, 255, 0.2)", background: "rgba(0, 242, 255, 0.02)" }}
            >
              <span className="text-cyan-400 font-bold font-mono">enosh@enosx:~$</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-mono text-white"
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
              <Cpu size={16} className={isExecuting ? "animate-pulse text-cyan-400" : "text-white/20"} />
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
