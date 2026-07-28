import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FounderModeContextType {
  isEnabled: boolean;
  toggleFounderMode: () => void;
  experimentalEffects: {
    glitchShader: boolean;
    pulseIntensity: number;
    customThemes: boolean;
    advancedVisuals: boolean;
  };
}

const FounderModeContext = createContext<FounderModeContextType | undefined>(undefined);

export function FounderModeProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("enosx-founder-mode");
    if (saved === "true") {
      setIsEnabled(true);
    }
  }, []);

  const toggleFounderMode = () => {
    setIsEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("enosx-founder-mode", String(newValue));
      return newValue;
    });
  };

  const experimentalEffects = {
    glitchShader: isEnabled,
    pulseIntensity: isEnabled ? 1.5 : 1,
    customThemes: isEnabled,
    advancedVisuals: isEnabled,
  };

  return (
    <FounderModeContext.Provider value={{ isEnabled, toggleFounderMode, experimentalEffects }}>
      {children}
    </FounderModeContext.Provider>
  );
}

export function useFounderMode() {
  const context = useContext(FounderModeContext);
  if (!context) {
    throw new Error("useFounderMode must be used within FounderModeProvider");
  }
  return context;
}
