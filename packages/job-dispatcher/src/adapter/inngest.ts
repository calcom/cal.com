import type { Logger } from "inngest";
import type { createStepTools } from "inngest/components/InngestStepTools";

import type { WorkflowContext } from "./types";

/**
 * Creates a WorkflowContext from Inngest's step and logger
 */
export function createInngestWorkflowContext(
  step: ReturnType<typeof createStepTools>,
  logger?: Logger
): WorkflowContext {
  return {
    async run<T>(stepId: string, fn: () => Promise<T>): Promise<T> {
      return await step.run(stepId, fn);
    },

    async sleep(stepId: string, duration: number | string): Promise<void> {
      // Inngest expects duration as string (e.g., "5m", "1h") or milliseconds
      if (typeof duration === "number") {
        // Convert milliseconds to seconds string
        const seconds = Math.ceil(duration / 1000);
        await step.sleep(stepId, `${seconds}s`);
      } else {
        await step.sleep(stepId, duration);
      }
    },

    log(message: string, level: "info" | "warn" | "error" = "info"): void {
      if (!logger) {
        console[level](message);
        return;
      }

      switch (level) {
        case "info":
          logger.info(message);
          break;
        case "warn":
          logger.warn(message);
          break;
        case "error":
          logger.error(message);
          break;
      }
    },
  };
}
