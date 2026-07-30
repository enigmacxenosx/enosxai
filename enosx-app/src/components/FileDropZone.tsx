/*
 * ENOSX AI — FileDropZone
 * Drag-and-drop file input with glassy overlay and tactile feedback
 * Features: glassmorphism, animated drop zone, file preview, upload animation
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, FileText } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTactileSounds } from "@/hooks/useTactileSounds";
import { toast } from "sonner";

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  isActive?: boolean;
  currentFileCount: number;
}

export default function FileDropZone({ onFileSelected, isActive = true, currentFileCount }: FileDropZoneProps) {
  const { config } = useTheme();
  const [isDragActive, setIsDragActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { playPop } = useTactileSounds({ enabled: true, volume: 0.4 });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const remainingSlots = 10 - currentFileCount;
        if (remainingSlots <= 0) {
          toast.error("Maximum 10 files allowed");
          return;
        }
        
        playPop();
        files.slice(0, remainingSlots).forEach(file => onFileSelected(file));
        
        if (files.length > remainingSlots) {
          toast.warning(`Only ${remainingSlots} more files could be added (max 10 total)`);
        }
      }
    },
    [onFileSelected, currentFileCount, playPop]
  );

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {isDragActive && (
        <motion.div
          ref={dropZoneRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="fixed inset-0 z-40 pointer-events-auto"
          style={{
            background: `rgba(${config.accentRgb}, 0.05)`,
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
          }}
        >
          {/* Drop Zone Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="rounded-3xl p-12 flex flex-col items-center gap-4 border-2 border-dashed"
              style={{
                background: `rgba(${config.accentRgb}, 0.08)`,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderColor: config.accent,
                boxShadow: `0 0 40px ${config.accent}, inset 0 0 40px rgba(${config.accentRgb}, 0.1)`,
              }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex gap-4"
              >
                <Upload size={48} style={{ color: config.accent }} />
                <ImageIcon size={48} style={{ color: config.accent }} />
                <FileText size={48} style={{ color: config.accent }} />
              </motion.div>

              <div className="text-center">
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{ color: config.text }}
                >
                  Drop Your Files Here
                </h3>
                <p
                  className="text-sm"
                  style={{ color: config.textMuted }}
                >
                  Images, Documents (PDF/Word/Excel), Code, or JSON
                </p>
                <p className="text-xs mt-2" style={{ color: config.accent }}>
                  {currentFileCount} / 10 files uploaded
                </p>
              </div>

              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1 h-1 rounded-full"
                style={{
                  background: config.accent,
                  boxShadow: `0 0 12px ${config.accent}`,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
