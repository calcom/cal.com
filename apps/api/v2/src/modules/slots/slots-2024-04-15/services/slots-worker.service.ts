import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import { Worker } from "worker_threads";

// Import WorkerOptions type
import type { GetScheduleOptions } from "@calcom/trpc/server/routers/viewer/slots/types";

import { TimeSlots } from "./slots-output.service";

/**
 * Interface to define the structure of messages sent to the worker.
 */
interface WorkerMessage {
  input: GetScheduleOptions["input"];
  ctx?: {
    req?: {
      cookies?: Record<string, string>;
      headers?: Record<string, string | string[]>;
    };
  };
}

/**
 * Interface to define the structure of results received from the worker.
 */
interface WorkerResult {
  success: boolean;
  data?: TimeSlots;
  error?: Error;
}

@Injectable()
export class SlotsWorkerService_2024_04_15 implements OnModuleDestroy {
  private readonly logger = new Logger("SlotsWorkerService_2024_04_15");
  private readonly workerPool: Worker[] = [];
  private readonly maxWorkers: number;
  private readonly taskQueue: Array<{
    resolve: (value: TimeSlots) => void;
    reject: (reason: Error) => void;
    options: GetScheduleOptions;
  }> = [];
  private availableWorkers: Worker[] = [];

  constructor(private readonly config: ConfigService) {
    this.maxWorkers = process.env.SLOTS_WORKER_POOL_SIZE
      ? parseInt(process.env.SLOTS_WORKER_POOL_SIZE, 10)
      : 4;
    // Workers are not initialized in E@E
    if (!this.config.get<boolean>("e2e")) {
      this.initializeWorkerPool();
    }
  }

  /**
   * Initializes the worker pool by creating a fixed number of worker threads.
   * Each worker is set up with persistent event listeners for errors and exits.
   */
  private initializeWorkerPool(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createNewWorker();
    }
  }

  /**
   * Creates a new worker thread and configures its essential, persistent event listeners.
   * Adds the new worker to the pool and available workers list.
   */
  private createNewWorker(): void {
    const worker = new Worker(path.join(__dirname, "../workers/slots.worker.js"));

    // These 'on' listeners are for the worker's overall lifecycle (crashes, exits).
    // They are persistent and responsible for calling handleWorkerFailure.
    worker.on("error", (err: Error) => {
      this.logger.error(`Worker experienced a persistent error: ${err.message}`, err.stack);
      this.handleWorkerFailure(worker);
    });

    worker.on("exit", (code: number) => {
      if (code !== 0) {
        this.logger.error(`Worker exited with code ${code}.`);
      }
      this.handleWorkerFailure(worker);
    });

    this.workerPool.push(worker);
    this.availableWorkers.push(worker);
  }

  /**
   * Handles the failure of a worker by removing it from pools and creating a new one.
   * This ensures the worker pool remains at the desired size and healthy.
   * @param failedWorker The worker that failed or exited.
   */
  private handleWorkerFailure(failedWorker: Worker): void {
    // Remove the failed worker from both pools
    this.logger.error(`Handling Worker ${failedWorker.threadId} failure`);
    this.workerPool.splice(this.workerPool.indexOf(failedWorker), 1);
    this.availableWorkers = this.availableWorkers.filter((w) => w !== failedWorker);

    try {
      failedWorker
        .terminate()
        .then(() => {
          this.logger.log(`Terminated failed worker ${failedWorker.threadId}`);
        })
        .catch((err) => {
          this.logger.error(`Error terminating failed worker ${failedWorker.threadId}: ${err?.message}`);
        });
    } catch (error) {
      this.logger.error(
        `Failed to invoke terminate method on failed worker ${failedWorker.threadId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Attempt to create a new worker to replace the failed one
    try {
      this.createNewWorker();
    } catch (error) {
      this.logger.error(
        `Failed to create replacement worker after failure: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined
      );
    }

    // After a worker fails, process the next task in case there are queued tasks
    this.processNextTask();
  }

  /**
   * Processes the next task in the queue if there are available workers.
   * Assigns a task to an available worker and sets up 'once' listeners for its specific result.
   */
  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.availableWorkers.shift();

      if (!task || !worker) {
        // This should theoretically not happen if the checks above pass, but good for type narrowing.
        return;
      }

      // Prepare context for serialization
      const serializableCtx: WorkerMessage["ctx"] = task.options.ctx
        ? {
            req: task.options.ctx.req
              ? {
                  cookies: (task.options.ctx.req.cookies as Record<string, string>) || {},
                  headers: (task.options.ctx.req.headers as Record<string, string>) || {},
                }
              : undefined,
          }
        : undefined;

      try {
        // Use 'once' listeners for task-specific responses and errors.
        // 'once' listeners automatically remove themselves after being invoked, preventing leaks.
        const messageListener = (result: WorkerResult) => {
          this.availableWorkers.push(worker); // Return worker to the available pool
          if (result.success) {
            task.resolve(result.data as TimeSlots);
          } else {
            task.reject(result.error ?? new Error("An error occurred in the worker thread."));
          }
          this.processNextTask(); // Attempt to process the next task
        };

        const errorListener = (err: Error) => {
          this.availableWorkers.push(worker); // Ensure worker is returned
          task.reject(new Error(`Worker thread error during task execution: ${err.message}`));
          this.processNextTask(); // Attempt to process the next task
        };

        worker.once("message", messageListener); // Use 'once' for task results
        worker.once("error", errorListener); // Use 'once' for task-specific errors

        worker.postMessage({
          input: task.options.input,
          ctx: serializableCtx,
        } as WorkerMessage);
      } catch (error) {
        // If posting the message itself fails (e.g., serialization error)
        this.availableWorkers.push(worker); // Ensure worker is returned to pool
        task.reject(
          new Error(
            `Failed to dispatch task to worker: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        this.processNextTask(); // Try to process next task if available
      }
    }
  }

  /**
   * Public method to request available time slots, offloading the computation to a worker thread.
   * Returns a Promise that resolves with the TimeSlots or rejects with an Error.
   * @param options The GetScheduleOptions to pass to the worker.
   * @returns A Promise resolving to TimeSlots.
   */
  public async getAvailableSlotsInWorker(options: GetScheduleOptions): Promise<TimeSlots> {
    return new Promise<TimeSlots>((resolve, reject) => {
      this.taskQueue.push({
        resolve,
        reject,
        options,
      });
      this.processNextTask(); // Attempt to process immediately
    });
  }

  onModuleDestroy(): void {
    this.logger.log("Terminating worker pool...");
    for (const worker of this.workerPool) {
      worker.terminate();
    }
    this.logger.log("Worker pool terminated.");
  }
}
