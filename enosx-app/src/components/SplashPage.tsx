import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";

export default function SplashPage({ onComplete }: { onComplete: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 1000); // Wait for exit animation
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505]"
    >
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%]"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(0, 242, 255, 0.15) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* Glass EX Logo */}
      <div className="relative flex items-center justify-center">
        {/* Glow Effect */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-40 h-40 rounded-full bg-cyan-400/20 blur-[60px]"
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <BrandMark size={128} animate />
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-16 flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex flex-col items-center"
        >
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold mb-1">
            from
          </span>
          <span 
            className="text-2xl text-white/80"
            style={{ 
              fontFamily: "'Eurostile', sans-serif",
              textShadow: "0 0 10px rgba(255,255,255,0.2)"
            }}
          >
            Enosx Technologies
          </span>
        </motion.div>
      </div>

      {/* Progress bar (Manus style) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3.5, ease: "easeInOut" }}
          className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.8)]"
        />
      </div>
    </motion.div>
  );
}
