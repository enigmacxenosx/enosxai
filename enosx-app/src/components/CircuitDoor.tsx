/*
 * ENOSX AI — CircuitDoor
 * A dramatic transition component that simulates opening high-tech circuit doors.
 * Used when entering "GOD MODE".
 */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface CircuitDoorProps {
  isActive: boolean;
  onAnimationComplete?: () => void;
}

export default function CircuitDoor({ isActive, onAnimationComplete }: CircuitDoorProps) {
  const [showText, setShowText] = useState(false);
  const [phase, setPhase] = useState<"idle" | "closing" | "display" | "opening">("idle");
  const hasCalledComplete = useRef(false);

  useEffect(() => {
    if (isActive && phase === "idle") {
      hasCalledComplete.current = false;
      setPhase("closing"); // Doors slide in
    } else if (!isActive) {
      setPhase("idle");
      setShowText(false);
      hasCalledComplete.current = false;
    }
  }, [isActive, phase]);

  useEffect(() => {
    if (phase === "closing") {
      // Doors have started closing, show text after a short delay
      const textTimer = setTimeout(() => setShowText(true), 600);
      // Move to display phase
      const displayTimer = setTimeout(() => setPhase("display"), 800);
      return () => {
        clearTimeout(textTimer);
        clearTimeout(displayTimer);
      };
    }
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (phase === "display") {
      // Show the text for a moment, then open the doors
      const openTimer = setTimeout(() => {
        setPhase("opening");
      }, 1500);
      return () => clearTimeout(openTimer);
    }
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (phase === "opening") {
      // Doors are opening, trigger callback after animation
      const completeTimer = setTimeout(() => {
        if (!hasCalledComplete.current && onAnimationComplete) {
          hasCalledComplete.current = true;
          onAnimationComplete();
        }
      }, 1000);
      return () => clearTimeout(completeTimer);
    }
    return undefined;
  }, [phase, onAnimationComplete]);

  // Determine if doors should be visible
  const showDoors = phase === "closing" || phase === "display";

  return (
    <AnimatePresence>
      {showDoors && (
        <motion.div
          key="circuit-door-container"
          className="fixed inset-0 z-[200] flex pointer-events-none"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          {/* Left Door */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ 
              type: "spring", 
              stiffness: 40, 
              damping: 15
            }}
            className="w-1/2 h-full relative overflow-hidden"
            style={{
              background: "#05050a",
              borderRight: "2px solid rgba(0, 242, 255, 0.5)",
              boxShadow: "10px 0 30px rgba(0, 242, 255, 0.2)",
            }}
          >
            {/* Circuit Pattern Left */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <pattern id="circuit-left" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 50 L30 50 L40 40 L60 40 L70 50 L100 50" fill="none" stroke="#00f2ff" strokeWidth="1" />
                <circle cx="40" cy="40" r="2" fill="#00f2ff" />
                <circle cx="70" cy="50" r="2" fill="#00f2ff" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#circuit-left)" />
            </svg>
            
            {/* Glowing Edge */}
            <motion.div 
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute right-0 top-0 bottom-0 w-[4px] bg-cyan-400 shadow-[0_0_15px_#00f2ff]"
            />
          </motion.div>

          {/* Right Door */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ 
              type: "spring", 
              stiffness: 40, 
              damping: 15
            }}
            className="w-1/2 h-full relative overflow-hidden"
            style={{
              background: "#05050a",
              borderLeft: "2px solid rgba(0, 242, 255, 0.5)",
              boxShadow: "-10px 0 30px rgba(0, 242, 255, 0.2)",
            }}
          >
            {/* Circuit Pattern Right */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <pattern id="circuit-right" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 20 L40 20 L50 30 L80 30 L100 30" fill="none" stroke="#00f2ff" strokeWidth="1" />
                <circle cx="50" cy="30" r="2" fill="#00f2ff" />
                <circle cx="80" cy="30" r="2" fill="#00f2ff" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#circuit-right)" />
            </svg>

            {/* Glowing Edge */}
            <motion.div 
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute left-0 top-0 bottom-0 w-[4px] bg-cyan-400 shadow-[0_0_15px_#00f2ff]"
            />
          </motion.div>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence>
              {showText && (
                <>
                  <motion.h1
                    initial={{ opacity: 0, scale: 0.8, letterSpacing: "0.2em" }}
                    animate={{ opacity: 1, scale: 1, letterSpacing: "0.5em" }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="text-6xl md:text-8xl font-black text-white italic z-[210]"
                    style={{
                      textShadow: "0 0 20px #00f2ff, 0 0 40px #00f2ff, 0 0 80px #00f2ff",
                      WebkitTextStroke: "1px rgba(255,255,255,0.2)",
                    }}
                  >
                    GOD MODE
                  </motion.h1>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    exit={{ width: 0 }}
                    className="h-[2px] bg-cyan-400 mt-4 shadow-[0_0_20px_#00f2ff]"
                  />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-cyan-400 font-mono mt-4 tracking-[0.3em] uppercase text-sm"
                  >
                    System Override Initialized
                  </motion.p>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Background overlay during door close */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 z-[190]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
