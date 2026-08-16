import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useScriptRuntime } from "@/hooks/useScriptRuntime";

export interface SystemAction {
  type: "open_url" | "launch_app" | "read_webpage" | "extract_links" | "click_element" | "fill_form" | "chain" | "delay" | "create_script" | "run_script";
  url?: string;
  app?: string;
  selector?: string;
  fields?: Array<{ selector: string; value: string }>;
  delay?: number;
  sequence?: SystemAction[];
  // Script actions
  name?: string; // script filename, e.g. "hello.py"
  language?: "python" | "shell" | "batch";
  content?: string; // script source code
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
  const { scripts, createScript, runScript } = useScriptRuntime();
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
      } else if (action.type === "create_script") {
        if (!action.name || typeof action.content !== "string") throw new Error("Script creation needs a name and content");
        const language = action.language ?? (action.name.endsWith(".bat") || action.name.endsWith(".cmd") ? "batch" : action.name.endsWith(".sh") ? "shell" : "python");
        const created = createScript(action.name, language, action.content);
        toast.success(`Script created: ${created.name} (${language})`);
        return true;
      } else if (action.type === "run_script") {
        if (!action.name) throw new Error("Run action needs a script name");
        const target = scripts.find((script) => script.name.toLowerCase() === action.name!.toLowerCase());
        if (!target) throw new Error(`No script named "${action.name}" exists — create it first with create_script`);
        runScript(target.id);
        toast.info(`Running script: ${target.name}`);
        return true;
      } else if (action.type === "read_webpage" || action.type === "extract_links") {
        if (!action.url) throw new Error("Missing URL");
        const response = await fetch("/api/browser/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Web reading request failed");
        }
        toast.success(action.type === "read_webpage" ? "Webpage read" : "Links extracted");
        return true;
      } else if (action.type === "click_element" || action.type === "fill_form") {
        toast.info("This website action needs a review and explicit approval before it can run.");
        return false;
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
