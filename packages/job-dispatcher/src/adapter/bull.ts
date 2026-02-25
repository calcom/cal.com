import type { Job } from "bullmq";

import type { WorkflowContext } from "./types";

/**
 * Workflow state stored in BullMQ job.data
 */
interface WorkflowState {
  completedSteps: Record<string, unknown>;
  sleepUntil?: number;
  currentStepId?: string;
}

/**
 * Job data structure with workflow metadata
 */
interface JobDataWithWorkflow<T = unknown> {
  payload: T;
  __wf?: WorkflowState;
}

/**
 * Creates a WorkflowContext from a BullMQ Job
 */
export function createBullWorkflowContext<T = unknown>(job: Job<T>): WorkflowContext {
  // Access workflow state from job.data
  const jobData = job.data as unknown as JobDataWithWorkflow<T>;

  // Initialize workflow state if not present
  if (!jobData.__wf) {
    jobData.__wf = {
      completedSteps: {},
    };
  }

  const workflowState = jobData.__wf;

  return {
    async run<R>(stepId: string, fn: () => Promise<R>): Promise<R> {
      // Check if step already completed (idempotency)
      if (stepId in workflowState.completedSteps) {
        // Return cached result
        return workflowState.completedSteps[stepId] as R;
      }

      // Execute step
      try {
        const result = await fn();

        // Cache result in workflow state
        workflowState.completedSteps[stepId] = result;

        // Persist state back to job
        await job.updateData(jobData as unknown as T);

        return result;
      } catch (error) {
        // On error, don't cache - allow retry
        throw error;
      }
    },

    async sleep(stepId: string, duration: number | string): Promise<void> {
      // Check if sleep already completed
      if (stepId in workflowState.completedSteps) {
        return; // Already slept, continue
      }

      // Convert duration to milliseconds
      let durationMs: number;
      if (typeof duration === "number") {
        durationMs = duration;
      } else {
        durationMs = parseDuration(duration);
      }

      const sleepUntil = Date.now() + durationMs;

      // Mark sleep as completed immediately (so we don't re-sleep on resume)
      workflowState.completedSteps[stepId] = true;
      workflowState.sleepUntil = sleepUntil;

      // Persist state
      await job.updateData(jobData as unknown as T);

      // Move job to delayed queue
      // This causes the current execution to stop
      // Job will be picked up again after delay
      await job.moveToDelayed(sleepUntil);

      // Throw to stop execution (job will resume later)
      throw new SleepSignal(durationMs);
    },

    log(message: string, level: "info" | "warn" | "error" = "info"): void {
      const prefix = `[Job ${job.id}]`;

      switch (level) {
        case "info":
          console.info(prefix, message);
          break;
        case "warn":
          console.warn(prefix, message);
          break;
        case "error":
          console.error(prefix, message);
          break;
      }

      // Also log to job logs
      job.log(`[${level.toUpperCase()}] ${message}`);
    },
  };
}

/**
 * Signal thrown when sleep is requested
 * Caught by worker to handle delayed execution
 */
export class SleepSignal extends Error {
  constructor(public readonly duration: number) {
    super("WORKFLOW_SLEEP");
    this.name = "SleepSignal";
  }
}

/**
 * Parse ISO 8601 duration string to milliseconds
 * Supports: "5s", "10m", "2h", "1d"
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}
