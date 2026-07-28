/*
 * ENOSX AI — CommandChainProgress
 * Real-time visualization of command chain execution
 * Features: step counter, progress bar, action details, glassmorphism
 */

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Zap, Clock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ChainProgress, SystemAction } from "@/hooks/useCommandChain";

interface CommandChainProgressProps {
  progress: ChainProgress;
}

function getActionLabel(action: SystemAction): string {
  if (action.type === "open_url") {
    return `Open: ${action.url?.split("/")[2] || action.url}`;
  } else if (action.type === "launch_app") {
    return `Launch: ${action.app}`;
  } else if (action.type === "delay") {
    return `Wait: ${action.delay || 1000}ms`;
  } else if (action.type === "chain") {
    return `Chain: ${action.sequence?.length || 0} steps`;
  }
  return "Unknown action";
}

export default function CommandChainProgress({ progress }: CommandChainProgressProps) {
  const { config } = useTheme();

  if (!progress.isExecuting && progress.totalSteps === 0) {
    return null;
  }

  const progressPercent = progress.totalSteps > 0 ? (progress.currentStep / progress.totalSteps) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] rounded-2xl p-4 z-50"
        style={{
          background: `rgba(${config.accentRgb}, 0.08)`,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid rgba(${config.accentRgb}, 0.2)`,
          boxShadow: `0 8px 32px rgba(${config.accentRgb}, 0.1)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: progress.isExecuting ? 360 : 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Zap size={16} style={{ color: config.accent }} />
            </motion.div>
            <span
              className="text-sm font-semibold"
              style={{ color: config.text, letterSpacing: "0.02em" }}
            >
              COMMAND CHAIN
            </span>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              background: `rgba(${config.accentRgb}, 0.15)`,
              color: config.accent,
              letterSpacing: "0.04em",
            }}
          >
            {progress.currentStep}/{progress.totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden mb-3"
          style={{ background: `rgba(${config.accentRgb}, 0.1)` }}
        >
          <motion.div
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
            style={{
              background: `linear-gradient(90deg, ${config.accent}, rgba(${config.accentRgb}, 0.6))`,
              boxShadow: `0 0 12px ${config.accent}`,
            }}
          />
        </div>

        {/* Current action */}
        {progress.currentAction && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-lg mb-3"
            style={{
              background: `rgba(${config.accentRgb}, 0.05)`,
              border: `1px solid rgba(${config.accentRgb}, 0.15)`,
            }}
          >
            <p
              className="text-xs font-medium"
              style={{ color: config.textMuted, letterSpacing: "0.01em" }}
            >
              Current Step
            </p>
            <p
              className="text-sm mt-1 truncate"
              style={{ color: config.text, fontWeight: 500 }}
            >
              {getActionLabel(progress.currentAction)}
            </p>
          </motion.div>
        )}

        {/* Completed actions */}
        {progress.completedActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-1 mb-3 max-h-24 overflow-y-auto"
          >
            {progress.completedActions.slice(-3).map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={12} style={{ color: "#22c55e", flexShrink: 0 }} />
                <span
                  className="truncate"
                  style={{ color: config.textMuted }}
                >
                  {getActionLabel(action)}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Failed actions */}
        {progress.failedActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-1 mb-3"
          >
            {progress.failedActions.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <AlertCircle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
                <span
                  className="truncate"
                  style={{ color: "#ef4444" }}
                >
                  {getActionLabel(item.action)}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 text-xs">
          {progress.isExecuting ? (
            <>
              <Clock size={12} style={{ color: config.accent }} />
              <span style={{ color: config.textMuted }}>
                Executing... {progress.completedActions.length + progress.failedActions.length} completed
              </span>
            </>
          ) : (
            <>
              {progress.failedActions.length === 0 ? (
                <>
                  <CheckCircle2 size={12} style={{ color: "#22c55e" }} />
                  <span style={{ color: "#22c55e" }}>All actions completed successfully!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={12} style={{ color: "#ef4444" }} />
                  <span style={{ color: "#ef4444" }}>
                    {progress.failedActions.length} action(s) failed
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
