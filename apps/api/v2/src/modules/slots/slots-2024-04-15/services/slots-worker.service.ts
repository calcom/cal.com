import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import { Worker } from "worker_threads";

import type { GetScheduleOptions } from "@calcom/trpc/server/routers/viewer/slots/types";

import { TimeSlots } from "./slots-output.service";

// Assuming this is where TimeSlots is defined

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
  private readonly logger = new Logger(SlotsWorkerService_2024_04_15.name);
  private readonly workerPool: Worker[] = [];
  private readonly maxWorkers: number; // Can be made configurable via env var
  private readonly taskQueue: Array<{
    resolve: (value: TimeSlots) => void;
    reject: (reason: Error) => void;
    options: GetScheduleOptions;
  }> = [];
  private availableWorkers: Worker[] = [];

  constructor(private readonly config: ConfigService) {
    // You could load this from a config service or environment variable
    this.maxWorkers = process.env.SLOTS_WORKER_POOL_SIZE
      ? parseInt(process.env.SLOTS_WORKER_POOL_SIZE, 10)
      : 4;
    !this.config.get<boolean>("e2e") && this.initializeWorkerPool();
  }

  /**
   * Initializes the worker pool by creating a fixed number of worker threads.
   * Each worker is set up with event listeners for messages, errors, and exits.
   */
  private initializeWorkerPool(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createNewWorker();
    }
  }

  /**
   * Creates a new worker thread and configures its event listeners.
   * Adds the new worker to the pool and available workers list.
   */
  private createNewWorker(): void {
    const worker = new Worker(path.join(__dirname, "../workers/slots.worker.js"));

    worker.on("message", (result: WorkerResult) => {
      // Messages handled by the specific task's `worker.once('message')` listener
      // This listener is primarily for general worker status or if a message wasn't
      // caught by a specific task listener (though that should be rare with `once`).
      if (!result.success) {
        this.logger.error(`Unhandled worker error message: ${result.error?.message}`, result.error?.stack);
      }
    });

    worker.on("error", (err: Error) => {
      this.logger.error(`Worker experienced an error: ${err.message}`, err.stack);
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
   * This ensures the worker pool remains at the desired size.
   * @param failedWorker The worker that failed or exited.
   */
  private handleWorkerFailure(failedWorker: Worker): void {
    // Remove the failed worker from both pools
    this.workerPool.splice(this.workerPool.indexOf(failedWorker), 1);
    this.availableWorkers = this.availableWorkers.filter((w) => w !== failedWorker);

    // Create a new worker to replace the failed one
    this.createNewWorker();

    // After a worker fails, process the next task in case there are queued tasks
    this.processNextTask();
  }

  /**
   * Processes the next task in the queue if there are available workers.
   * Assigns a task to an available worker and sets up listeners for its specific result.
   */
  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.availableWorkers.shift();

      if (!task || !worker) {
        // This should theoretically not happen if the checks above pass
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
        // Set up listeners for this specific task's outcome
        const messageListener = (result: WorkerResult) => {
          // Put the worker back in the available pool once done
          this.availableWorkers.push(worker);
          if (result.success) {
            task.resolve(result.data as TimeSlots);
          } else {
            const error = result.error;
            task.reject(error ?? new Error("INTERNAL_SERVER_ERROR"));
          }
          // Remove listeners to prevent memory leaks and ensure only one resolution/rejection per task
          worker.off("message", messageListener);
          worker.off("error", errorListener);
        };

        const errorListener = (err: Error) => {
          this.availableWorkers.push(worker); // Ensure worker is returned
          task.reject(new Error(err.message));
          worker.off("message", messageListener);
          worker.off("error", errorListener);
        };

        worker.on("message", messageListener);
        worker.on("error", errorListener);

        worker.postMessage({
          input: task.options.input,
          ctx: serializableCtx,
        } as WorkerMessage);
      } catch (error) {
        // If posting the message itself fails
        this.availableWorkers.push(worker); // Ensure worker is returned
        task.reject(new Error("Failed to dispatch task to worker"));
        this.processNextTask(); // Try to process next task if available
      } finally {
        // Always try to process the next task, even if there was a dispatch error.
        this.processNextTask();
      }
    }
  }

  /**
   * Public method to request available time slots, offloading the computation to a worker thread.
   * Returns a Promise that resolves with the TimeSlots or rejects with a Error.
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

  /**
   * NestJS lifecycle hook. Called when the module is being destroyed.
   * Terminates all worker threads to prevent memory leaks and ensure graceful shutdown.
   */

  onModuleDestroy(): void {
    this.logger.log("Terminating worker pool...");
    for (const worker of this.workerPool) {
      worker.terminate();
    }
    this.logger.log("Worker pool terminated.");
  }
}
