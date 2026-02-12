import type { JobsOptions, Queue } from "bullmq";

import { sendToInngest } from "./inngestClient";
import type {
  DispatchJobInput,
  DispatcherLogger,
  DispatchResult,
  JobDispatcherConfig,
  QueueAddReturn,
} from "./types";

// ---------------------------------------------------------------------------
// Default BullMQ job options
// ---------------------------------------------------------------------------

const DEFAULT_BULLMQ_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 3000,
  },
  removeOnComplete: false,
  removeOnFail: false,
};

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
 * Build the canonical job name used by both BullMQ and Inngest.
 *
 * Format: `${queue}/${name}`
 */
function buildJobName(queue: string, name: string): string {
  return `${queue}/${name}`;
}

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

// ---------------------------------------------------------------------------
// JobDispatcher
// ---------------------------------------------------------------------------

export class JobDispatcher {
  private readonly queueRegistry: Record<string, Queue>;
  private readonly useBullmq: boolean;
  private readonly logger: DispatcherLogger;

  constructor(config: JobDispatcherConfig) {
    this.queueRegistry = config.queueRegistry;
    this.useBullmq = resolveUseBullmq(config.useBullmq);
    this.logger = config.logger ?? defaultLogger;

    this.logger.info("[job-dispatcher] Initialized", {
      useBullmq: this.useBullmq,
      registeredQueues: Object.keys(this.queueRegistry),
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Dispatch a job using the BullMQ‑first / Inngest‑fallback strategy.
   *
   * 1. If `useBullmq` is `false` → send directly to Inngest.
   * 2. Otherwise attempt BullMQ; on failure fall back to Inngest.
   */
  async dispatch<T = unknown>(input: DispatchJobInput<T>): Promise<DispatchResult> {
    const { queue: queueName, name, data, bullmqOptions } = input;
    const jobName = buildJobName(queueName, name);

    // ── Fast path: BullMQ disabled ──────────────────────────────────────
    if (!this.useBullmq) {
      this.logger.info("[job-dispatcher] BullMQ disabled – routing to Inngest", { jobName });
      const result = await sendToInngest(jobName, data, this.logger);
      return { jobName, backend: "inngest", fallback: false, result };
    }

    // ── Primary path: BullMQ ────────────────────────────────────────────
    try {
      const result = await this.enqueueToBullmq(queueName, jobName, data, bullmqOptions);

      this.logger.info("[job-dispatcher] Job dispatched via BullMQ", {
        jobName,
        queue: queueName,
        result,
      });

      return { jobName, backend: "bullmq", fallback: false, result };
    } catch (bullmqError) {
      // ── Fallback: Inngest ───────────────────────────────────────────
      this.logger.warn("[job-dispatcher] BullMQ dispatch failed – falling back to Inngest", {
        jobName,
        error: bullmqError instanceof Error ? bullmqError.message : String(bullmqError),
      });

      try {
        const result = await sendToInngest(jobName, data, this.logger);
        return { jobName, backend: "inngest", fallback: true, result };
      } catch (inngestError) {
        // Both backends failed – surface a clear error
        this.logger.error("[job-dispatcher] CRITICAL: Both BullMQ and Inngest failed", {
          jobName,
          bullmqError: bullmqError instanceof Error ? bullmqError.message : String(bullmqError),
          inngestError: inngestError instanceof Error ? inngestError.message : String(inngestError),
        });

        throw new JobDispatchError(`Failed to dispatch job "${jobName}" via both BullMQ and Inngest`, {
          cause: inngestError as Error,
          jobName,
          bullmqError,
          inngestError,
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async enqueueToBullmq<T>(
    queueName: string,
    jobName: string,
    data: T,
    overrides?: JobsOptions
  ): Promise<QueueAddReturn> {
    const queue = this.queueRegistry[queueName];

    if (!queue) {
      throw new Error(
        `[job-dispatcher] Queue "${queueName}" not found in registry. ` +
          `Available queues: [${Object.keys(this.queueRegistry).join(", ")}]`
      );
    }

    const options: JobsOptions = {
      ...DEFAULT_BULLMQ_OPTIONS,
      ...overrides,
    };

    return await queue.add(jobName, data, options);
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
