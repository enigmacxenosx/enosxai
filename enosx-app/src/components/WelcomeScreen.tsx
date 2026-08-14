/*
 * ENOSX AI — WelcomeScreen
 * Animated welcome with floating orb avatar
 * Features: breathing orb, staggered fade-in, glassmorphism cards
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { useAuth } from "@/contexts/AuthContext";
import { Conversation } from "@/lib/types";
import BentoDashboard from "./BentoDashboard";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  isCompact?: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
}

const GREETINGS = [
  "Hello there!",
  "I'm ENOSX AI (EX)",
  "How can I assist you today?",
  "Let's build something amazing.",
  "Your AI workspace is ready.",
  "Powered by Enosx Technologies",
  "Ready to transform your workflow."
];

export default function WelcomeScreen({ 
  onSuggestion, 
  isCompact,
  conversations,
  activeConversation
}: WelcomeScreenProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8">
        {/* Glass EX Logo with Branding */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-24 h-24 mb-4 flex items-center justify-center rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(124,111,247,0.3)] overflow-hidden group"
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          title="ENOSX AI (EX) - Enosx Technologies"
        >
          <img src="/favicon.png" alt="EX Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          <motion.div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ opacity: 0, y: -5 }}
            whileHover={{ opacity: 1, y: 0 }}
          >
            ENOSX AI
          </motion.div>
          <motion.div
            animate={{ left: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center w-full"
        >
          <AnimatePresence mode="wait">
            <motion.h2
              key={greetingIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-4xl font-semibold tracking-tight mb-3 min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center text-center"
              style={{ color: config.text }}
            >
              {GREETINGS[greetingIndex]}
            </motion.h2>
          </AnimatePresence>
          
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.05] active:scale-[0.95] rainbow-glow shadow-xl"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "white",
                  backdropFilter: "blur(10px)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" className="mr-1">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
                Securely sync your chat history & preferences
              </p>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sm text-white/50 mt-6"
          >
            Powered by Enosx Technologies
          </motion.p>
        </motion.div>

        {/* Bento Dashboard Integration */}
        {!isCompact && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="w-full max-w-4xl mt-4"
          >
            <BentoDashboard 
              conversations={conversations} 
              activeConversation={activeConversation} 
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
