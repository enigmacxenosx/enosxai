/*
 * ENOSX AI — FileDropZone
 * Drag-and-drop file input with glassy overlay and tactile feedback
 * Features: glassmorphism, animated drop zone, file preview, upload animation
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, CheckCircle2, AlertCircle, Image as ImageIcon, FileText } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTactileSounds } from "@/hooks/useTactileSounds";
import { toast } from "sonner";

interface FileDropZoneProps {
  onFileSelected: (file: File, content: string) => void;
  isActive?: boolean;
  currentFileCount: number;
}

const SUPPORTED_TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/json",
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-java",
  "text/x-c",
  "text/x-cpp",
  "application/xml",
  "text/html",
  "text/css",
];

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const SUPPORTED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export default function FileDropZone({ onFileSelected, isActive = true, currentFileCount }: FileDropZoneProps) {
  const { config } = useTheme();
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { playPop, playSuccess, playError } = useTactileSounds({ enabled: true, volume: 0.4 });

  const handleFile = useCallback(
    async (file: File) => {
      if (currentFileCount >= 10) {
        toast.error("Maximum 10 files allowed");
        playError();
        return;
      }

      const isText = SUPPORTED_TEXT_TYPES.includes(file.type) || file.name.match(/\.(txt|md|json|js|ts|py|java|c|cpp|xml|html|css)$/i);
      const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isDoc = SUPPORTED_DOC_TYPES.includes(file.type) || file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i);

      if (!isText && !isImage && !isDoc) {
        setUploadStatus("error");
        setUploadMessage(`Unsupported file type: ${file.type || file.name.split(".").pop()}`);
        playError();
        setTimeout(() => setUploadStatus("idle"), 3000);
        return;
      }

      // Check file size (max 10MB for documents)
      const maxSize = isDoc ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadStatus("error");
        setUploadMessage(`File too large (max ${isDoc ? "10MB" : "5MB"})`);
        playError();
        setTimeout(() => setUploadStatus("idle"), 3000);
        return;
      }

      setUploadStatus("loading");
      playPop();

      try {
        let content = "";
        if (isText) {
          content = await file.text();
        } else {
          // Convert image or doc to base64
          content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        setUploadStatus("success");
        setUploadMessage(`Loaded: ${file.name}`);
        playSuccess();
        onFileSelected(file, content);
        setTimeout(() => setUploadStatus("idle"), 2000);
      } catch (error) {
        setUploadStatus("error");
        setUploadMessage("Failed to read file");
        playError();
        setTimeout(() => setUploadStatus("idle"), 3000);
      }
    },
    [onFileSelected, playPop, playSuccess, playError, currentFileCount]
  );

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
        // Process up to remaining slots
        const remainingSlots = 10 - currentFileCount;
        files.slice(0, remainingSlots).forEach(file => handleFile(file));
        
        if (files.length > remainingSlots) {
          toast.warning(`Only ${remainingSlots} more files could be added (max 10 total)`);
        }
      }
    },
    [handleFile, currentFileCount]
  );

  if (!isActive) return null;

  return (
    <>
      {/* Drag Zone Overlay */}
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

      {/* Upload Status Toast */}
      <AnimatePresence>
        {uploadStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-6 z-50 rounded-xl p-4 flex items-center gap-3"
            style={{
              background: `rgba(${config.accentRgb}, 0.1)`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid rgba(${config.accentRgb}, 0.2)`,
            }}
          >
            {uploadStatus === "loading" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <File size={16} style={{ color: config.accent }} />
              </motion.div>
            )}
            {uploadStatus === "success" && (
              <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
            )}
            {uploadStatus === "error" && (
              <AlertCircle size={16} style={{ color: "#ef4444" }} />
            )}

            <span
              className="text-xs font-medium"
              style={{
                color:
                  uploadStatus === "success"
                    ? "#22c55e"
                    : uploadStatus === "error"
                    ? "#ef4444"
                    : config.text,
              }}
            >
              {uploadMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
