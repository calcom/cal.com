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
  // packages/job-dispatcher/src/dispatcher.ts

  /**
   * Dispatch a job — non-blocking by default.
   *
   * Flow:
   *  1. BullMQ disabled → send to Inngest, return immediately.
   *  2. Enqueue to BullMQ.
   *     a. Enqueue fails (Redis down) → fallback to Inngest, return immediately.
   *  3. Detect job type (delayed/repeat/immediate):
   *     a. Delayed or repeat → skip pickup check, return immediately.
   *     b. Immediate job → start background monitoring if non-blocking.
   *  4. Return to caller right after enqueue succeeds.
   *     In background (immediate jobs only), poll for worker pickup:
   *     a. Picked up within timeout → done, BullMQ handled it.
   *     b. Not picked up → remove job, silently send to Inngest as fallback.
   *
   * The caller is never blocked by the pickup polling window unless allowBlocking=true.
   */
  async dispatch<T = unknown>(input: DispatchJobInput<T>): Promise<DispatchResult> {
    const {
      queue: queueName,
      name,
      data,
      bullmqOptions,
      allowBlocking = false,
      inngestTs,
      forceInngest = false,
    } = input;

    this.logger.info("[job-dispatcher] Dispatch called", {
      jobName: name,
      allowBlocking,
      hasDelay: !!bullmqOptions?.delay,
      hasRepeat: !!bullmqOptions?.repeat,
    });

    // ── Fast path: BullMQ disabled ─────────────────────────────────────────
    if (!this.useBullmq || forceInngest) {
      this.logger.info("[job-dispatcher] BullMQ disabled – routing to Inngest", { jobName: name });
      return await this.fallbackToInngest(name, data, "BullMQ disabled", inngestTs);
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
      return await this.fallbackToInngest(name, data, enqueueError, inngestTs);
    }

    // ── Step 2: Determine job type ────────────────────────────────────────
    const isDelayedJob = bullmqOptions?.delay && bullmqOptions.delay > 0;
    const isRepeatJob = !!bullmqOptions?.repeat;
    const shouldSkipPickupCheck = isDelayedJob || isRepeatJob;

    if (shouldSkipPickupCheck) {
      this.logger.info(
        `[job-dispatcher] Skipping pickup check – ${isDelayedJob ? "delayed job" : "repeat job"}`,
        {
          jobName: name,
          queue: queueName,
          jobId: job.id,
          delay: bullmqOptions?.delay,
          repeatPattern: bullmqOptions?.repeat?.pattern,
        }
      );

      // For delayed/repeat jobs, successful enqueue = success
      return { jobName: name, backend: "bullmq", fallback: false, result: job };
    }

    // ── Step 3: Immediate jobs – monitor for pickup ───────────────────────

    // ============================================================
    // BLOCKING MODE
    // ============================================================
    if (allowBlocking) {
      this.logger.info("[job-dispatcher] Blocking mode enabled – waiting full lifecycle", {
        jobName: name,
        jobId: job.id,
      });

      return await this.monitorAndFallbackBlocking(job, queueName, name, data, inngestTs);
    }

    // ============================================================
    // NON-BLOCKING MODE (default)
    // ============================================================

    this.logger.info("[job-dispatcher] Job enqueued to BullMQ – returning immediately", {
      jobName: name,
      queue: queueName,
      jobId: job.id,
    });

    // Start background monitoring (no await)
    void this.monitorAndFallback(job, queueName, name, data, inngestTs);

    return { jobName: name, backend: "bullmq", fallback: false, result: job };
  }

  /**
   * Background monitoring (non-blocking).
   * Polls for worker pickup, silently falls back to Inngest if needed.
   */
  private async monitorAndFallback(
    job: Job,
    queueName: string,
    jobName: string,
    data: unknown,
    inngestTs?: number
  ): Promise<void> {
    try {
      const pickedUp = await this.waitForPickup(job, queueName);

      if (pickedUp) {
        this.logger.info("[job-dispatcher] Job picked up by worker via BullMQ", {
          jobName,
          queue: queueName,
          jobId: job.id,
        });
        return;
      }

      this.logger.warn(
        "[job-dispatcher] Worker did not pick up job within timeout – " +
          "removing from queue and falling back to Inngest",
        {
          jobName,
          queue: queueName,
          jobId: job.id,
          timeoutMs: this.pickupTimeoutMs,
        }
      );

      await this.removeJob(job, queueName);
      await this.fallbackToInngest(jobName, data, new Error("Worker pickup timeout"), inngestTs);
    } catch (monitorError) {
      this.logger.error("[job-dispatcher] Error during background monitoring", {
        jobName,
        jobId: job.id,
        error: monitorError instanceof Error ? monitorError.message : String(monitorError),
      });

      try {
        await this.removeJob(job, queueName);
      } catch (removeError) {
        this.logger.error("[job-dispatcher] Failed to remove job after monitoring error", {
          jobName,
          jobId: job.id,
          removeError: removeError instanceof Error ? removeError.message : String(removeError),
        });
      }

      await this.fallbackToInngest(jobName, data, monitorError, inngestTs);
    }
  }

  /**
   * Blocking monitoring.
   * Waits for worker pickup, falls back to Inngest if needed.
   */
  private async monitorAndFallbackBlocking(
    job: Job,
    queueName: string,
    jobName: string,
    data: unknown,
    inngestTs?: number
  ): Promise<DispatchResult> {
    try {
      const pickedUp = await this.waitForPickup(job, queueName);

      if (pickedUp) {
        this.logger.info("[job-dispatcher] Job picked up by worker via BullMQ", {
          jobName,
          queue: queueName,
          jobId: job.id,
        });
        return { jobName, backend: "bullmq", fallback: false, result: job };
      }

      this.logger.warn(
        "[job-dispatcher] Worker did not pick up job within timeout – " +
          "removing from queue and falling back to Inngest",
        {
          jobName,
          queue: queueName,
          jobId: job.id,
          timeoutMs: this.pickupTimeoutMs,
        }
      );

      await this.removeJob(job, queueName);
      return await this.fallbackToInngest(jobName, data, new Error("Worker pickup timeout"), inngestTs);
    } catch (pickupError) {
      this.logger.warn("[job-dispatcher] Error during pickup check – removing job and falling back", {
        jobName,
        error: pickupError instanceof Error ? pickupError.message : String(pickupError),
      });

      try {
        await this.removeJob(job, queueName);
      } catch (removeError) {
        this.logger.error(
          "[job-dispatcher] Failed to remove job from queue after pickup error. " +
            "Duplicate execution is possible.",
          {
            jobName,
            jobId: job.id,
            removeError: removeError instanceof Error ? removeError.message : String(removeError),
          }
        );
      }

      return await this.fallbackToInngest(jobName, data, pickupError, inngestTs);
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
    //needed name in data for manual retries of job
    const dataWithName = {
      ...data,
      name: jobName,
    };
    return queue.add(jobName, dataWithName, overrides);
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

  /**
   * Fallback to Inngest with optional timestamp for delayed execution.
   */
  private async fallbackToInngest(
    jobName: string,
    data: unknown,
    originalError: unknown,
    inngestTs?: number
  ): Promise<DispatchResult> {
    try {
      const result = await sendToInngest(jobName, data, this.logger, inngestTs);
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
