import { useState, useCallback } from "react";
import { Attachment } from "@/lib/types";
import { nanoid } from "nanoid";

export interface FileContext {
  files: Attachment[];
  isLoaded: boolean;
}

export function useFileContext() {
  const [fileContext, setFileContext] = useState<FileContext>({
    files: [],
    isLoaded: false,
  });

  const loadFile = useCallback((file: File, content: string) => {
    setFileContext((prev) => {
      if (prev.files.length >= 10) return prev;

      const ext = file.name.split(".").pop() || "";
      const newAttachment: Attachment = {
        id: nanoid(),
        name: file.name,
        type: ext,
        mimeType: file.type || undefined,
        size: file.size,
        content,
      };

      const newFiles = [...prev.files, newAttachment];
      return { files: newFiles, isLoaded: true };
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFileContext((prev) => {
      const newFiles = prev.files.filter((f) => f.id !== id);
      return { files: newFiles, isLoaded: newFiles.length > 0 };
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFileContext({ files: [], isLoaded: false });
  }, []);

  const getFileContextMessage = useCallback(() => {
    if (!fileContext.isLoaded) return "";

    let message = "\n\n[ATTACHED FILES CONTEXT]";
    fileContext.files.forEach((file) => {
      const sizeInKB = (file.size / 1024).toFixed(2);
      const extension = file.type.toLowerCase();
      const mimeType = file.mimeType || "";
      const isImage = mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension);
      const isPlayable = mimeType.startsWith("audio/") || mimeType.startsWith("video/") || ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "mp4", "webm", "mov", "avi", "mkv", "m4v"].includes(extension);
      const isText = mimeType.startsWith("text/") || ["txt", "md", "json", "js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "xml", "html", "css", "sql", "yaml", "yml", "csv"].includes(extension);

      if (isImage) {
        message += `\n- Image: ${file.name} (${file.mimeType || file.type}, ${sizeInKB}KB) [Image content is attached to the message]`;
      } else if (isPlayable) {
        message += `\n- Playable media: ${file.name} (${file.mimeType || file.type}, ${sizeInKB}KB) [Media is attached for playback]`;
      } else if (isText) {
        message += `\n- File: ${file.name} (${file.mimeType || file.type}, ${sizeInKB}KB)\n\`\`\`${file.type}\n${file.content}\n\`\`\``;
      } else {
        message += `\n- File: ${file.name} (${file.mimeType || "unknown type"}, ${sizeInKB}KB) [Binary file attached; use the file preview or download action]`;
      }
    });

    return message;
  }, [fileContext]);

  return { fileContext, loadFile, removeFile, clearFiles, getFileContextMessage };
}
