import { queueRegistry, queueEventsRegistry } from "@calid/queue";
import type { Job, JobsOptions, Queue, QueueEvents } from "bullmq";

import { sendToInngest } from "./inngestClient";
import type { DispatchJobInput, DispatcherLogger, DispatchResult, JobDispatcherConfig } from "./types";

// // ---------------------------------------------------------------------------
// // Default BullMQ job options
// // ---------------------------------------------------------------------------

// const DEFAULT_BULLMQ_OPTIONS: JobsOptions = {
//   attempts: 3,
//   backoff: {
//     type: "exponential",
//     delay: 3000,
//   },
//   removeOnComplete: false,
//   removeOnFail: false,
// };

// ---------------------------------------------------------------------------
// Defaults for pickup detection
// ---------------------------------------------------------------------------

const DEFAULT_PICKUP_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Console‑based default logger
// ---------------------------------------------------------------------------

const defaultLogger: DispatcherLogger = {
  info: (msg, meta) => console.log(msg, meta ?? ""),
  warn: (msg, meta) => console.warn(msg, meta ?? ""),
  error: (msg, meta) => console.error(msg, meta ?? ""),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Resolve the `useBullmq` flag.
 *
 * Priority: explicit config value > `USE_BULLMQ` env var > default `true`.
 */
function resolveUseBullmq(configValue?: boolean): boolean {
  if (configValue !== undefined) return configValue;

  const env = process.env.USE_BULLMQ;
  if (env !== undefined) {
    return env !== "false" && env !== "0";
  }

  // Default: BullMQ enabled
  return true;
}

/**
 * Sleep helper for polling.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * States that mean a worker has picked up (or already completed) the job.
 * If the job is in any of these states, we know the worker is alive and
 * handling it — no fallback needed.
 */
const PICKED_UP_STATES = new Set(["active", "completed", "failed"]);

/**
 * States that mean the job is still sitting in the queue untouched.
 */
const WAITING_STATES = new Set(["waiting", "waiting-children", "delayed", "prioritized"]);

// ---------------------------------------------------------------------------
// JobDispatcher
// ---------------------------------------------------------------------------

export class JobDispatcher {
  private readonly queueRegistry: Record<string, Queue>;
  private readonly queueEventsRegistry: Record<string, QueueEvents>;
  private readonly useBullmq: boolean;
  private readonly pickupTimeoutMs: number;
  private readonly logger: DispatcherLogger;

  constructor(config: JobDispatcherConfig) {
    this.queueRegistry = config.queueRegistry;
    this.queueEventsRegistry = config.queueEventsRegistry ?? {};
    this.useBullmq = resolveUseBullmq(config.useBullmq);
    this.pickupTimeoutMs = config.pickupTimeoutMs ?? DEFAULT_PICKUP_TIMEOUT_MS;
    this.logger = config.logger ?? defaultLogger;

    this.logger.info("[job-dispatcher] Initialized", {
      useBullmq: this.useBullmq,
      pickupTimeoutMs: this.pickupTimeoutMs,
      registeredQueues: Object.keys(this.queueRegistry),
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Dispatch a job using the BullMQ‑first / Inngest‑fallback strategy with exactly‑once delivery guarantee.
   *
   * Flow:
   *  1. If `useBullmq` is `false`  → send directly to Inngest.
   *  2. Try to enqueue to BullMQ.
   *     a. If enqueue fails (Redis down) → fallback to Inngest.
   *  3. After enqueue succeeds, poll the job state for up to
   *     `pickupTimeoutMs` to confirm a worker picked it up.
   *     a. If picked up (`active`/`completed`/`failed`) → done via BullMQ.
   *     b. If still `waiting` after timeout → remove job from queue,
   *        then send to Inngest (worker is down).
   *
   * This prevents the dual‑execution problem where a job sits in Redis,
   * gets sent to Inngest, and then later the worker comes back and
   * processes the same job again.
   */
  async dispatch<T = unknown>(input: DispatchJobInput<T>): Promise<DispatchResult> {
    const { queue: queueName, name, data, bullmqOptions } = input;
    const jobName = name;

    // ── Fast path: BullMQ disabled ──────────────────────────────────────
    if (!this.useBullmq) {
      this.logger.info("[job-dispatcher] BullMQ disabled – routing to Inngest", { jobName });
      const result = await sendToInngest(jobName, data, this.logger);
      return { jobName, backend: "inngest", fallback: false, result };
    }

    // ── Step 1: Try to enqueue to BullMQ ────────────────────────────────
    let job: Job;
    try {
      job = await this.enqueueToBullmq(queueName, jobName, data, bullmqOptions);
    } catch (enqueueError) {
      // Redis is down or queue doesn't exist → immediate Inngest fallback
      this.logger.warn("[job-dispatcher] BullMQ enqueue failed – falling back to Inngest", {
        jobName,
        error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
      });

      return this.fallbackToInngest(jobName, data, enqueueError);
    }

    // ── Step 2: Wait for worker pickup ──────────────────────────────────
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

      // ── Step 3: Worker didn't pick up → remove & fallback ───────────
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

      return this.fallbackToInngest(jobName, data, new Error("Worker pickup timeout"));
    } catch (pickupError) {
      // Something went wrong during polling (e.g. Redis dropped mid‑check).
      // The job might still be in the queue, so try to remove it before
      // falling back to Inngest.
      this.logger.warn("[job-dispatcher] Error during pickup check – removing job and falling back", {
        jobName,
        error: pickupError instanceof Error ? pickupError.message : String(pickupError),
      });

      try {
        await this.removeJob(job, queueName);
      } catch (removeError) {
        // Best‑effort removal failed. Log but continue with fallback.
        // Risk: potential duplicate if Redis recovers and worker grabs it.
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

      return this.fallbackToInngest(jobName, data, pickupError);
    }
  }

  // -----------------------------------------------------------------------
  // Private: BullMQ enqueue
  // -----------------------------------------------------------------------

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

    const options: JobsOptions = {
      ...overrides,
    };

    return queue.add(jobName, data, options);
  }

  // -----------------------------------------------------------------------
  // Private: Pickup detection
  // -----------------------------------------------------------------------

  /**
   * Detect if a job was picked up by worker using lock detection polling
   * Here we check if the job lock has been acquired falling back to polling job state
   *
   * @returns `true` if a worker picked up (or already completed) the job,
   *          `false` if the job is still waiting after the timeout.
   */
  private async waitForPickup(job: Job, queueName: string): Promise<boolean> {
    const deadline = Date.now() + this.pickupTimeoutMs;
    const pollInterval = 150; // fast but cheap

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
        // 1️⃣ Check if worker acquired lock (strongest signal)
        const lockExists = await client.exists(lockKey);
        if (lockExists) {
          this.logger.info("[job-dispatcher] Worker lock detected (job picked up)", {
            jobId: job.id,
            queue: queueName,
          });
          return true;
        }

        // 2️⃣ Fallback: check state (covers very fast jobs)
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

  // -----------------------------------------------------------------------
  // Private: Safe job removal
  // -----------------------------------------------------------------------

  /**
   * Remove a job from the queue. Only removes if still in a waiting state
   * to avoid yanking a job that a worker just started processing.
   */
  private async removeJob(job: Job, queueName: string): Promise<void> {
    const state = await job.getState();

    // Double‑check: only remove if still waiting. If a worker grabbed it
    // between our last check and now, leave it alone.
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

  // -----------------------------------------------------------------------
  // Private: Inngest fallback
  // -----------------------------------------------------------------------

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
    details: {
      cause: Error;
      jobName: string;
      bullmqError: unknown;
      inngestError: unknown;
    }
  ) {
    super(message);
    this.name = "JobDispatchError";
    this.jobName = details.jobName;
    this.bullmqError = details.bullmqError;
    this.inngestError = details.inngestError;
  }
}

const dispatcher = new JobDispatcher({ queueRegistry, queueEventsRegistry });
export default dispatcher;
