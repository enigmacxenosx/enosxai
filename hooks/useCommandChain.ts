import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface SystemAction {
  type: "open_url" | "launch_app" | "chain" | "delay";
  url?: string;
  app?: string;
  delay?: number;
  sequence?: SystemAction[];
}

export interface ChainProgress {
  totalSteps: number;
  currentStep: number;
  currentAction: SystemAction | null;
  isExecuting: boolean;
  completedActions: SystemAction[];
  failedActions: { action: SystemAction; error: string }[];
}

export function useCommandChain() {
  const [progress, setProgress] = useState<ChainProgress>({
    totalSteps: 0,
    currentStep: 0,
    currentAction: null,
    isExecuting: false,
    completedActions: [],
    failedActions: [],
  });

  const executeAction = useCallback(async (action: SystemAction): Promise<boolean> => {
    try {
      if (action.type === "open_url") {
        if (!action.url) throw new Error("Missing URL");
        window.open(action.url, "_blank");
        toast.success(`Opening: ${action.url}`);
        return true;
      } else if (action.type === "launch_app") {
        if (!action.app) throw new Error("Missing app name");
        console.log(`LAUNCH_APP_INTENT: ${action.app}`);
        toast.info(`Launching: ${action.app}`);
        return true;
      } else if (action.type === "delay") {
        const delayMs = action.delay || 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return true;
      }
      return false;
    } catch (error) {
      toast.error(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, []);

  const executeChain = useCallback(
    async (actions: SystemAction[]) => {
      setProgress({
        totalSteps: actions.length,
        currentStep: 0,
        currentAction: null,
        isExecuting: true,
        completedActions: [],
        failedActions: [],
      });

      const completed: SystemAction[] = [];
      const failed: { action: SystemAction; error: string }[] = [];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        // Update progress
        setProgress((prev) => ({
          ...prev,
          currentStep: i + 1,
          currentAction: action,
        }));

        try {
          if (action.type === "chain" && action.sequence) {
            // Recursively execute nested chain
            await executeChain(action.sequence);
          } else {
            // Execute single action
            const success = await executeAction(action);
            if (success) {
              completed.push(action);
            } else {
              failed.push({ action, error: "Action returned false" });
            }
          }

          // Apply delay if specified
          if (action.delay) {
            await new Promise((resolve) => setTimeout(resolve, action.delay));
          } else if (i < actions.length - 1) {
            // Default 1 second delay between actions
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          failed.push({
            action,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Final progress update
      setProgress((prev) => ({
        ...prev,
        isExecuting: false,
        completedActions: completed,
        failedActions: failed,
      }));

      // Summary toast
      if (failed.length === 0) {
        toast.success(`✓ All ${actions.length} actions completed successfully!`);
      } else {
        toast.warning(
          `⚠ Completed ${completed.length}/${actions.length} actions. ${failed.length} failed.`
        );
      }

      return { completed, failed };
    },
    [executeAction]
  );

  return {
    progress,
    executeAction,
    executeChain,
  };
}
