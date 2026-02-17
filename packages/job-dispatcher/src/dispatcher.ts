import { queueRegistry } from "@calid/queue";
import type { Job, JobsOptions, Queue } from "bullmq";

import { sendToInngest } from "./inngestClient";
import type { DispatchJobInput, DispatcherLogger, DispatchResult, JobDispatcherConfig } from "./types";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PICKUP_TIMEOUT_MS = 5000;

const defaultLogger: DispatcherLogger = {
  info: (msg, meta) => console.log(msg, meta ?? ""),
  warn: (msg, meta) => console.warn(msg, meta ?? ""),
  error: (msg, meta) => console.error(msg, meta ?? ""),
};

function resolveUseBullmq(configValue?: boolean): boolean {
  if (configValue !== undefined) return configValue;
  const env = process.env.USE_BULLMQ;
  if (env !== undefined) return env !== "false" && env !== "0";
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PICKED_UP_STATES = new Set(["active", "completed", "failed"]);

// ---------------------------------------------------------------------------
// JobDispatcher
// ---------------------------------------------------------------------------

export class JobDispatcher {
  private readonly queueRegistry: Record<string, Queue>;
  private readonly useBullmq: boolean;
  private readonly pickupTimeoutMs: number;
  private readonly logger: DispatcherLogger;

  constructor(config: JobDispatcherConfig) {
    this.queueRegistry = config.queueRegistry;
    this.useBullmq = resolveUseBullmq(config.useBullmq);
    this.pickupTimeoutMs = config.pickupTimeoutMs ?? DEFAULT_PICKUP_TIMEOUT_MS;
    this.logger = config.logger ?? defaultLogger;

    this.logger.info("[job-dispatcher] Initialized", {
      useBullmq: this.useBullmq,
      pickupTimeoutMs: this.pickupTimeoutMs,
      registeredQueues: Object.keys(this.queueRegistry),
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Dispatch a job — non-blocking.
   *
   * Flow:
   *  1. BullMQ disabled → send to Inngest, return immediately.
   *  2. Enqueue to BullMQ.
   *     a. Enqueue fails (Redis down) → fallback to Inngest, return immediately.
   *  3. Return to caller right after enqueue succeeds (BullMQ path).
   *     In the background, poll for worker pickup:
   *     a. Picked up within timeout → done, BullMQ handled it.
   *     b. Not picked up → remove job, silently send to Inngest as fallback.
   *
   * The caller is never blocked by the pickup polling window.
   */
  async dispatch(input: DispatchJobInput): Promise<DispatchResult> {
    const { queue: queueName, name, data, bullmqOptions } = input;

    // ── Fast path: BullMQ disabled ─────────────────────────────────────────
    if (!this.useBullmq) {
      this.logger.info("[job-dispatcher] BullMQ disabled – routing to Inngest", { jobName: name });
      const result = await sendToInngest(name, data, this.logger);
      return { jobName: name, backend: "inngest", fallback: false, result };
    }

    // ── Step 1: Try to enqueue to BullMQ ───────────────────────────────────
    let job: Job;
    try {
      job = await this.enqueueToBullmq(queueName, name, data, bullmqOptions);
    } catch (enqueueError) {
      this.logger.warn("[job-dispatcher] BullMQ enqueue failed – falling back to Inngest", {
        jobName: name,
        error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
      });
      return this.fallbackToInngest(name, data, enqueueError);
    }

    // ── Step 2: Return immediately, monitor pickup in the background ────────
    this.logger.info("[job-dispatcher] Job enqueued to BullMQ – returning to caller", {
      jobName: name,
      queue: queueName,
      jobId: job.id,
    });

    // Intentionally NOT awaited. Errors are swallowed internally so an
    // unhandled-rejection never surfaces to the caller's event loop.
    void this.monitorAndFallback(job, queueName, name, data);

    return { jobName: name, backend: "bullmq", fallback: false, result: job };
  }

  // -------------------------------------------------------------------------
  // Private: background pickup monitor
  // -------------------------------------------------------------------------

  /**
   * Runs entirely in the background after `dispatch` has already returned.
   * If the worker doesn't pick up the job within the timeout, the job is
   * removed from BullMQ and re-sent via Inngest.
   *
   * All errors are caught internally — this method must never throw or produce
   * an unhandled rejection.
   */
  private async monitorAndFallback(
    job: Job,
    queueName: string,
    jobName: string,
    data: unknown
  ): Promise<void> {
    try {
      const pickedUp = await this.waitForPickup(job, queueName);

      if (pickedUp) {
        this.logger.info("[job-dispatcher] Background: job picked up by worker", {
          jobName,
          queue: queueName,
          jobId: job.id,
        });
        return;
      }

      // Worker didn't pick up — remove from queue and send via Inngest.
      this.logger.warn(
        "[job-dispatcher] Background: worker pickup timeout – removing job and falling back to Inngest",
        { jobName, queue: queueName, jobId: job.id, timeoutMs: this.pickupTimeoutMs }
      );

      await this.removeJob(job, queueName);
      await this.fallbackToInngest(jobName, data, new Error("Worker pickup timeout"));
    } catch (error) {
      // Last-resort catch: log and move on. Nothing the caller can do at this point.
      this.logger.error("[job-dispatcher] Background monitor encountered an unexpected error", {
        jobName,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Private: BullMQ enqueue
  // -------------------------------------------------------------------------

  private async enqueueToBullmq<T>(
    queueName: string,
    jobName: string,
    data: T,
    overrides?: JobsOptions
  ): Promise<Job> {
    const queue = this.queueRegistry[queueName];
    if (!queue) {
      throw new Error(
        `[job-dispatcher] Queue "${queueName}" not found in registry. ` +
          `Available queues: [${Object.keys(this.queueRegistry).join(", ")}]`
      );
    }
    return queue.add(jobName, data, overrides);
  }

  // -------------------------------------------------------------------------
  // Private: Pickup detection
  // -------------------------------------------------------------------------

  private async waitForPickup(job: Job, queueName: string): Promise<boolean> {
    const deadline = Date.now() + this.pickupTimeoutMs;
    const pollInterval = 150;
    const lockKey = `bull:${queueName}:${job.id}:lock`;

    const queue = this.queueRegistry[queueName];
    if (!queue) {
      this.logger.error("[job-dispatcher] Queue not found during pickup check", {
        queueName,
        jobId: job.id,
      });
      return false;
    }

    const client = await queue.client;

    while (Date.now() < deadline) {
      try {
        const lockExists = await client.exists(lockKey);
        if (lockExists) {
          this.logger.info("[job-dispatcher] Worker lock detected (job picked up)", {
            jobId: job.id,
            queue: queueName,
          });
          return true;
        }

        const state = await job.getState();
        if (PICKED_UP_STATES.has(state)) {
          this.logger.info("[job-dispatcher] Job already processed (state check)", {
            jobId: job.id,
            state,
          });
          return true;
        }

        await sleep(pollInterval);
      } catch (error) {
        this.logger.warn("[job-dispatcher] Error during pickup detection", {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(pollInterval);
      }
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Private: Safe job removal
  // -------------------------------------------------------------------------

  private async removeJob(job: Job, queueName: string): Promise<void> {
    const state = await job.getState();
    if (PICKED_UP_STATES.has(state)) {
      this.logger.info("[job-dispatcher] Job was picked up between timeout and removal – skipping removal", {
        jobId: job.id,
        state,
        queue: queueName,
      });
      return;
    }
    await job.remove();
    this.logger.info("[job-dispatcher] Removed unprocessed job from queue", {
      jobId: job.id,
      queue: queueName,
    });
  }

  // -------------------------------------------------------------------------
  // Private: Inngest fallback
  // -------------------------------------------------------------------------

  private async fallbackToInngest(
    jobName: string,
    data: unknown,
    originalError: unknown
  ): Promise<DispatchResult> {
    try {
      const result = await sendToInngest(jobName, data, this.logger);
      return { jobName, backend: "inngest", fallback: true, result };
    } catch (inngestError) {
      this.logger.error("[job-dispatcher] CRITICAL: Both BullMQ and Inngest failed", {
        jobName,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
        inngestError: inngestError instanceof Error ? inngestError.message : String(inngestError),
      });
      throw new JobDispatchError(`Failed to dispatch job "${jobName}" via both BullMQ and Inngest`, {
        cause: inngestError as Error,
        jobName,
        bullmqError: originalError,
        inngestError,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class JobDispatchError extends Error {
  public readonly jobName: string;
  public readonly bullmqError: unknown;
  public readonly inngestError: unknown;

  constructor(
    message: string,
    details: { cause: Error; jobName: string; bullmqError: unknown; inngestError: unknown }
  ) {
    super(message);
    this.name = "JobDispatchError";
    this.jobName = details.jobName;
    this.bullmqError = details.bullmqError;
    this.inngestError = details.inngestError;
  }
}

const dispatcher = new JobDispatcher({ queueRegistry });
export default dispatcher;
