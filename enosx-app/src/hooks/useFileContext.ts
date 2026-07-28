import { useState, useCallback } from "react";

export interface FileContext {
  file: File | null;
  content: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isLoaded: boolean;
}

export function useFileContext() {
  const [fileContext, setFileContext] = useState<FileContext>({
    file: null,
    content: "",
    fileName: "",
    fileType: "",
    fileSize: 0,
    isLoaded: false,
  });

  const loadFile = useCallback((file: File, content: string) => {
    const ext = file.name.split(".").pop() || "";
    setFileContext({
      file,
      content,
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      isLoaded: true,
    });
  }, []);

  const clearFile = useCallback(() => {
    setFileContext({
      file: null,
      content: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
      isLoaded: false,
    });
  }, []);

  const getFileContextMessage = useCallback(() => {
    if (!fileContext.isLoaded) return "";

    const sizeInKB = (fileContext.fileSize / 1024).toFixed(2);
    return `\n\n[File Context: ${fileContext.fileName} (${fileContext.fileType}, ${sizeInKB}KB)]\n\`\`\`${fileContext.fileType}\n${fileContext.content}\n\`\`\``;
  }, [fileContext]);

  return {
    fileContext,
    loadFile,
    clearFile,
    getFileContextMessage,
  };
}
