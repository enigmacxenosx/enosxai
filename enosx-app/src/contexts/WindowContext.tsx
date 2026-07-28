import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type AppType =
  | "vscode"
  | "chrome"
  | "firefox"
  | "edge"
  | "terminal"
  | "explorer"
  | "notion"
  | "slack"
  | "discord"
  | "figma"
  | "photoshop"
  | "unknown";

export interface ActiveWindow {
  appType: AppType;
  appName: string;
  windowTitle: string;
  isDetected: boolean;
}

interface WindowContextType {
  activeWindow: ActiveWindow;
  updateActiveWindow: (app: Partial<ActiveWindow>) => void;
  simulateActiveWindow: (appType: AppType) => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

const APP_KEYWORDS: Record<string, AppType> = {
  "visual studio code": "vscode",
  "vscode": "vscode",
  "code": "vscode",
  "chrome": "chrome",
  "google chrome": "chrome",
  "firefox": "firefox",
  "edge": "edge",
  "microsoft edge": "edge",
  "terminal": "terminal",
  "cmd": "terminal",
  "powershell": "terminal",
  "explorer": "explorer",
  "windows explorer": "explorer",
  "notion": "notion",
  "slack": "slack",
  "discord": "discord",
  "figma": "figma",
  "photoshop": "photoshop",
};

function detectAppType(title: string): AppType {
  const lowerTitle = title.toLowerCase();
  for (const [keyword, appType] of Object.entries(APP_KEYWORDS)) {
    if (lowerTitle.includes(keyword)) {
      return appType;
    }
  }
  return "unknown";
}

export function WindowContextProvider({ children }: { children: ReactNode }) {
  const [activeWindow, setActiveWindow] = useState<ActiveWindow>({
    appType: "unknown",
    appName: "Unknown App",
    windowTitle: "No active window detected",
    isDetected: false,
  });

  const updateActiveWindow = useCallback((app: Partial<ActiveWindow>) => {
    setActiveWindow((prev) => ({
      ...prev,
      ...app,
      isDetected: true,
    }));
  }, []);

  const simulateActiveWindow = useCallback((appType: AppType) => {
    const appNames: Record<AppType, string> = {
      vscode: "Visual Studio Code",
      chrome: "Google Chrome",
      firefox: "Mozilla Firefox",
      edge: "Microsoft Edge",
      terminal: "Terminal",
      explorer: "Windows Explorer",
      notion: "Notion",
      slack: "Slack",
      discord: "Discord",
      figma: "Figma",
      photoshop: "Adobe Photoshop",
      unknown: "Unknown Application",
    };

    setActiveWindow({
      appType,
      appName: appNames[appType],
      windowTitle: `${appNames[appType]} - Active`,
      isDetected: true,
    });
  }, []);

  // Detect active window from document title and focus events
  useEffect(() => {
    const handleFocus = () => {
      const title = document.title;
      const appType = detectAppType(title);
      updateActiveWindow({
        appType,
        appName: title.split(" - ")[0] || "Browser Tab",
        windowTitle: title,
      });
    };

    // Listen for title changes
    const observer = new MutationObserver(() => {
      handleFocus();
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("focus", handleFocus);

    // Initial detection
    handleFocus();

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", handleFocus);
    };
  }, [updateActiveWindow]);

  return (
    <WindowContext.Provider value={{ activeWindow, updateActiveWindow, simulateActiveWindow }}>
      {children}
    </WindowContext.Provider>
  );
}

export function useActiveWindow() {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error("useActiveWindow must be used within WindowContextProvider");
  }
  return context;
}
