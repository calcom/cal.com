import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IncomingMessage } from "node:http";
import { parentPort, isMainThread } from "node:worker_threads";

import { SlotsWorkerModule } from "./slots.worker.module";

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

interface WorkerMessage {
  input: any; // Use a more specific type if available, e.g., TGetScheduleInputSchema
  ctx?: ContextForGetSchedule;
}

interface WorkerResult {
  success: boolean;
  data?: any; // Use TimeSlots
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

async function bootstrapWorkerApp() {
  if (isMainThread) {
    console.error("slots-worker-main.ts should only be run in a worker thread.");
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(SlotsWorkerModule);
  const logger = app.get(Logger); // Get the NestJS Logger instance
  logger.log("NestJS worker application bootstrapped successfully.");

  const availableSlotsService = app.get(AvailableSlotsService);

  parentPort?.on("message", async (data: WorkerMessage) => {
    try {
      const { input, ctx } = data;

      const result = await availableSlotsService.getAvailableSlots({ input, ctx });
      parentPort?.postMessage({ success: true, data: result } as WorkerResult);
    } catch (error: any) {
      parentPort?.postMessage({
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      });
    }
  });

  parentPort?.on("close", async () => {
    logger.log("Worker port closed. Shutting down NestJS worker application.");
    await app.close();
  });

  parentPort?.on("disconnect", async () => {
    logger.log("Worker port disconnected. Shutting down NestJS worker application.");
    await app.close();
  });
}

bootstrapWorkerApp();
