/**
 * Unified workflow context interface
 * Provides the same API regardless of backend (BullMQ or Inngest)
 */
export interface WorkflowContext {
  /**
   * Execute a step with idempotency
   * @param stepId - Unique identifier for this step
   * @param fn - Function to execute
   * @returns Result of the function (cached on retry)
   */
  run<T>(stepId: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Sleep for a duration
   * @param stepId - Unique identifier for this sleep
   * @param duration - Duration in milliseconds or ISO duration string
   */
  sleep(stepId: string, duration: number | string): Promise<void>;

  /**
   * Log a message
   * @param message - Message to log
   * @param level - Log level (info, warn, error)
   */
  log(message: string, level?: "info" | "warn" | "error"): void;
}
