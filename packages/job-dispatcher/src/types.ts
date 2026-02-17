import type { JobsOptions, Queue, QueueEvents } from "bullmq";
import type { Inngest } from "inngest";

export type InngestClient = InstanceType<
  typeof Inngest<{
    id: string;
    eventKey: string;
  }>
>;

// ---------------------------------------------------------------------------
// Job input
// ---------------------------------------------------------------------------
export type QueueAddReturn = Awaited<ReturnType<Queue["add"]>>;
export type InngestSendReturn = Awaited<ReturnType<InngestClient["send"]>>;

export type DispatchJobInput<T = unknown> = {
  /** Queue name – must match a key in the @calid/queue registry */
  queue: string;
  /** Job name within the queue (e.g. "reminder.cancelled") */
  name: string;
  /** Arbitrary JSON payload forwarded to the worker / Inngest function */
  data: T;
  /** Override default BullMQ JobsOptions for this specific dispatch */
  bullmqOptions?: JobsOptions;

  /**trigger blocking behaviour to observe entire job lifecycle */
  allowBlocking?: boolean;
};

// ---------------------------------------------------------------------------
// Dispatcher configuration
// ---------------------------------------------------------------------------

export type JobDispatcherConfig = {
  /**
   * When `true` (default), the dispatcher tries BullMQ first and falls back
   * to Inngest on failure.  When `false`, all jobs are sent directly to
   * Inngest (useful during early migration or when BullMQ infra is down).
   *
   * Can also be driven by the `USE_BULLMQ` environment variable.
   */
  useBullmq?: boolean;

  /**
   * Queue registry from `@calid/queue`.
   * Map of queue‑name → BullMQ Queue instance.
   */
  queueRegistry: Record<string, Queue>;

  // Optional registry of QueueEvents for listening to job lifecycle events (e.g. for logging or metrics)
  queueEventsRegistry?: Record<string, QueueEvents>;
  /**
   * How long (ms) to wait for a worker to pick up the job after enqueuing.
   * If the job is still in `waiting` state after this timeout, it is removed
   * from the queue and routed to Inngest to guarantee exactly‑once execution.
   *
   * @default 5000 (5 seconds)
   */
  pickupTimeoutMs?: number;

  /**
   * Polling interval (ms) when checking if a worker picked up the job.
   *
   * @default 500
   */
  pickupPollIntervalMs?: number;

  /**
   * Optional custom logger.  Defaults to `console`.
   */
  logger?: DispatcherLogger;
};

// ---------------------------------------------------------------------------
// Logger interface (keep it minimal so any logger works)
// ---------------------------------------------------------------------------

export interface DispatcherLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Dispatch result (returned for observability / testing)
// ---------------------------------------------------------------------------

export type DispatchResult = {
  jobId?: string;
  /** The canonical job name (same as input `name`) */
  jobName: string;
  /** Which backend actually handled the job */
  backend: "bullmq" | "inngest";
  /** Whether a fallback was used */
  fallback: boolean;
  /** If BullMQ was used, the result from `queue.add()` */
  result?: QueueAddReturn | InngestSendReturn;
};
