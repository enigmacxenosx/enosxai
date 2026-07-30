/*
 * ENOSX AI — ImageDisplay
 * Renders assistant-generated images inline in the chat.
 * Supports URLs and base64 data URLs with a lightbox preview.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Maximize2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ImageDisplayProps {
  src: string;
  alt?: string;
  caption?: string;
}

export default function ImageDisplay({ src, alt = "Generated image", caption }: ImageDisplayProps) {
  const { config } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `enosx-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div className="relative group rounded-xl overflow-hidden my-2" style={{ maxWidth: 420 }}>
        {/* Loading shimmer */}
        {!isLoaded && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        )}

        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full max-h-[350px] object-contain rounded-xl border transition-all duration-300 cursor-pointer
            ${isLoaded ? "border-white/10 hover:border-white/20" : "opacity-0"}
          `}
          onClick={() => setIsExpanded(true)}
        />

        {/* Action overlay */}
        <AnimatePresence>
          {isLoaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all duration-150"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                }}
                title="Expand"
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all duration-150"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                }}
                title="Download"
              >
                <Download size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {caption && (
          <div
            className="mt-1.5 px-1 text-[11px] italic opacity-60"
            style={{ color: config.text }}
          >
            {caption}
          </div>
        )}
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
            onClick={() => setIsExpanded(false)}
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
              }}
            >
              <X size={20} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
              }}
            >
              <Download size={20} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
