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
        size: file.size,
        content: content,
      };

      const newFiles = [...prev.files, newAttachment];
      return {
        files: newFiles,
        isLoaded: true,
      };
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFileContext((prev) => {
      const newFiles = prev.files.filter((f) => f.id !== id);
      return {
        files: newFiles,
        isLoaded: newFiles.length > 0,
      };
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFileContext({
      files: [],
      isLoaded: false,
    });
  }, []);

  const getFileContextMessage = useCallback(() => {
    if (!fileContext.isLoaded) return "";

    let message = "\n\n[ATTACHED FILES CONTEXT]";
    fileContext.files.forEach((file) => {
      const sizeInKB = (file.size / 1024).toFixed(2);
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(file.type.toLowerCase());
      
      if (isImage) {
        message += `\n- Image: ${file.name} (${file.type}, ${sizeInKB}KB) [Image content is attached to the message]`;
      } else {
        message += `\n- File: ${file.name} (${file.type}, ${sizeInKB}KB)\n\`\`\`${file.type}\n${file.content}\n\`\`\``;
      }
    });
    
    return message;
  }, [fileContext]);

  return {
    fileContext,
    loadFile,
    removeFile,
    clearFiles,
    getFileContextMessage,
  };
}
