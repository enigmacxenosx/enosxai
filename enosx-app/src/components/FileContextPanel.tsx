import { motion, AnimatePresence } from "framer-motion";
import { File, X, Image as ImageIcon, FileText } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { FileContext } from "@/hooks/useFileContext";

interface FileContextPanelProps {
  fileContext: FileContext;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function FileContextPanel({ fileContext, onRemove, onClear }: FileContextPanelProps) {
  const { config } = useDarkMode();

  if (!fileContext.isLoaded || fileContext.files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 px-4 md:px-0 max-w-5xl mx-auto">
      <AnimatePresence>
        {fileContext.files.map((file) => {
          const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(file.type.toLowerCase());
          const isDoc = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(file.type.toLowerCase());
          
          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              {isImage ? (
                <ImageIcon size={14} className="text-cyan-400" />
              ) : isDoc ? (
                <FileText size={14} className="text-emerald-400" />
              ) : (
                <File size={14} style={{ color: config.accent }} />
              )}
              
              <span className="text-[10px] font-medium truncate max-w-[120px]" style={{ color: config.text }}>
                {file.name}
              </span>

              <button
                onClick={() => onRemove(file.id)}
                className="ml-1 p-0.5 rounded-sm hover:bg-white/10 transition-colors"
                style={{ color: config.textMuted }}
              >
                <X size={12} />
              </button>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-black/80 text-[8px] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {fileContext.files.length > 1 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClear}
          className="px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-white/5 transition-colors"
          style={{ color: config.accent, border: `1px solid rgba(${config.accentRgb}, 0.2)` }}
        >
          CLEAR ALL
        </motion.button>
      )}
    </div>
  );
}
