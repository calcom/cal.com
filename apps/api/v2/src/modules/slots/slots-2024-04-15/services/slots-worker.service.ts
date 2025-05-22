import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import path from "path";
import { Worker } from "worker_threads";

import type { GetScheduleOptions } from "@calcom/trpc/server/routers/viewer/slots/types";

import { TRPCError } from "@trpc/server";

import { TimeSlots } from "./slots-output.service";

@Injectable()
export class SlotsWorkerService_2024_04_15 implements OnModuleDestroy {
  private readonly logger = new Logger(SlotsWorkerService_2024_04_15.name);
  private readonly workerPool: Worker[] = [];
  private readonly maxWorkers = 4; // Can be made configurable via env var
  private readonly taskQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    options: GetScheduleOptions;
  }> = [];
  private availableWorkers: Worker[] = [];

  constructor() {
    this.initializeWorkerPool();
  }

  private initializeWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(path.join(__dirname, "../workers/slots.worker.js"));
      this.workerPool.push(worker);
      this.availableWorkers.push(worker);

      worker.on("message", (result) => {
        worker.removeAllListeners("error");
        worker.removeAllListeners("exit");

        this.availableWorkers.push(worker);
        this.processNextTask();

        if (!result.success) {
          const error = result.error;
          const trpcError = new TRPCError({
            code: error.code || "INTERNAL_SERVER_ERROR",
            message: error.message || "An error occurred in the worker thread",
          });
          trpcError.stack = error.stack;
          throw trpcError;
        }
      });

      worker.on("error", (err) => {
        this.logger.error(`Worker error: ${err.message}`, err.stack);
        const index = this.workerPool.indexOf(worker);
        if (index !== -1) {
          this.workerPool.splice(index, 1);
          this.availableWorkers = this.availableWorkers.filter((w) => w !== worker);
          const newWorker = new Worker(path.join(__dirname, "../workers/slots.worker.js"));
          this.workerPool.push(newWorker);
          this.availableWorkers.push(newWorker);
        }
        this.processNextTask();
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          this.logger.error(`Worker exited with code ${code}`);
          const index = this.workerPool.indexOf(worker);
          if (index !== -1) {
            this.workerPool.splice(index, 1);
            this.availableWorkers = this.availableWorkers.filter((w) => w !== worker);
            const newWorker = new Worker(path.join(__dirname, "../workers/slots.worker.js"));
            this.workerPool.push(newWorker);
            this.availableWorkers.push(newWorker);
          }
        }
        this.processNextTask();
      });
    }
  }

  private processNextTask() {
    if (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.availableWorkers.shift();

      if (task && worker) {
        const serializableCtx = task.options.ctx
          ? {
              req: task.options.ctx.req
                ? {
                    cookies: task.options.ctx.req.cookies || {},
                    headers: task.options.ctx.req.headers || {},
                  }
                : undefined,
            }
          : undefined;

        try {
          worker.once("message", (result) => {
            if (result.success) {
              task.resolve(result.data);
            } else {
              const error = result.error;
              const trpcError = new TRPCError({
                code: error.code || "INTERNAL_SERVER_ERROR",
                message: error.message || "An error occurred in the worker thread",
              });
              trpcError.stack = error.stack;
              task.reject(trpcError);
            }
          });

          worker.once("error", (err) => {
            task.reject(
              new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Worker error: ${err.message}`,
              })
            );
          });

          worker.postMessage({
            input: task.options.input,
            ctx: serializableCtx,
          });
        } catch (error) {
          this.availableWorkers.push(worker);
          task.reject(
            new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to run task in worker: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            })
          );
          this.processNextTask();
        }
      }
    }
  }

  async getAvailableSlotsInWorker(options: GetScheduleOptions): Promise<TimeSlots> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        resolve,
        reject,
        options,
      });

      this.processNextTask();
    });
  }

  onModuleDestroy() {
    for (const worker of this.workerPool) {
      worker.terminate();
    }
  }
}
