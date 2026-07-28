/*
 * ENOSX AI — FileDropZone
 * Drag-and-drop file input with glassy overlay and tactile feedback
 * Features: glassmorphism, animated drop zone, file preview, upload animation
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, CheckCircle2, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTactileSounds } from "@/hooks/useTactileSounds";

interface FileDropZoneProps {
  onFileSelected: (file: File, content: string) => void;
  isActive?: boolean;
}

const SUPPORTED_TYPES = [
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

export default function FileDropZone({ onFileSelected, isActive = true }: FileDropZoneProps) {
  const { config } = useTheme();
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { playPop, playSuccess, playError } = useTactileSounds({ enabled: true, volume: 0.4 });

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(txt|md|json|js|ts|py|java|c|cpp|xml|html|css)$/i)) {
        setUploadStatus("error");
        setUploadMessage(`Unsupported file type: ${file.type || file.name.split(".").pop()}`);
        playError();
        setTimeout(() => setUploadStatus("idle"), 3000);
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus("error");
        setUploadMessage("File too large (max 5MB)");
        playError();
        setTimeout(() => setUploadStatus("idle"), 3000);
        return;
      }

      setUploadStatus("loading");
      playPop();

      try {
        const content = await file.text();
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
    [onFileSelected, playPop, playSuccess, playError]
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

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
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
                >
                  <Upload size={48} style={{ color: config.accent }} />
                </motion.div>

                <div className="text-center">
                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: config.text }}
                  >
                    Drop Your File Here
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: config.textMuted }}
                  >
                    Code, markdown, JSON, or text files supported
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
