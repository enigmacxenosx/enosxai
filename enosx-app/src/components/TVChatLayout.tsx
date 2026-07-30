import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, History, Plus, Settings, Volume2 } from "lucide-react";
import { Conversation, Message, VoiceState } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import MessageBubble from "./MessageBubble";
import CommandBar, { type AIMode } from "./CommandBar";

interface TVChatLayoutProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createNewChat: () => void;
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
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function TVChatLayout({
  conversations,
  activeId,
  setActiveId,
  createNewChat,
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
  messagesEndRef,
}: TVChatLayoutProps) {
  const { config } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus logic for TV remote navigation could be added here
  
  return (
    <div className="flex flex-col h-full w-full bg-[#050505] text-white p-12 overflow-hidden font-sans">
      {/* TV Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-3xl font-black">E</span>
          </div>
          <div>
            <h1 className="text-5xl font-bold tracking-tight">ENOSX AI</h1>
            <p className="text-xl text-white/40 font-medium uppercase tracking-widest mt-1">Television Interface</p>
          </div>
        </div>
        
        <div className="flex gap-6">
          <button 
            onClick={createNewChat}
            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all focus:ring-4 focus:ring-cyan-500 outline-none"
          >
            <Plus size={32} />
            <span className="text-2xl font-semibold">New Chat</span>
          </button>
          <button className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all focus:ring-4 focus:ring-cyan-500 outline-none">
            <History size={32} />
          </button>
          <button className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all focus:ring-4 focus:ring-cyan-500 outline-none">
            <Settings size={32} />
          </button>
        </div>
      </header>

      {/* Main Content Area - Split Screen for TV */}
      <div className="flex-1 flex gap-12 overflow-hidden">
        {/* Left: Chat History/Messages */}
        <div className="flex-[2] flex flex-col bg-white/5 rounded-[40px] border border-white/10 p-10 overflow-y-auto scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-48 h-48 rounded-full bg-cyan-500/10 flex items-center justify-center mb-8 border border-cyan-500/20"
              >
                <Mic size={80} className="text-cyan-400" />
              </motion.div>
              <h2 className="text-6xl font-bold mb-4">How can I help you today?</h2>
              <p className="text-3xl text-white/50 max-w-2xl">Use your remote's microphone or select a prompt below to start.</p>
              
              <div className="grid grid-cols-2 gap-6 mt-16 w-full max-w-4xl">
                {["What's the weather?", "Play some music", "Tell me a joke", "Show my photos"].map((prompt) => (
                  <button 
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="p-8 rounded-3xl bg-white/5 border border-white/10 text-2xl font-medium hover:bg-white/10 transition-all focus:ring-4 focus:ring-cyan-500 outline-none text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {messages.map((msg, idx) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-8 rounded-[32px] ${msg.role === 'user' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/20' : 'bg-white/10 border border-white/10'}`}>
                    <div className="text-3xl leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-white/30 text-xl font-medium px-4">
                    {msg.role === 'assistant' && <Volume2 size={24} />}
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Right: Quick Actions/Context (Optional for TV) */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-[40px] border border-white/10 p-10 flex-1">
            <h3 className="text-3xl font-bold mb-6 flex items-center gap-4">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
              Voice Assistant
            </h3>
            <div className="flex flex-col items-center justify-center h-full pb-10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={voiceState === 'listening' ? stopListening : startListening}
                className={`w-40 h-40 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                  voiceState === 'listening' 
                    ? 'bg-red-500 shadow-red-500/40 animate-pulse' 
                    : 'bg-cyan-500 shadow-cyan-500/40'
                } focus:ring-8 focus:ring-white outline-none`}
              >
                <Mic size={64} color="white" />
              </motion.button>
              <p className="mt-8 text-2xl font-semibold text-white/70">
                {voiceState === 'listening' ? 'Listening...' : 'Press to Speak'}
              </p>
              {transcript && (
                <div className="mt-8 p-6 bg-black/40 rounded-2xl border border-white/10 w-full text-center italic text-2xl text-cyan-300">
                  "{transcript}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Command Bar for text fallback if needed, but styled for TV */}
      <div className="mt-12 opacity-0 pointer-events-none absolute">
        <CommandBar
          onSend={handleSend}
          isLoading={isLoading}
          voiceState={voiceState}
          transcript={transcript}
          isVoiceSupported={isVoiceSupported}
          onStartVoice={startListening}
          onStopVoice={stopListening}
          onStopSpeaking={stopSpeaking}
        />
      </div>
    </div>
  );
}
