import { parentPort } from "worker_threads";

import { AvailableSlotsService } from "@calcom/platform-libraries/slots";

const availableSlotsService = new AvailableSlotsService();

parentPort?.on("message", async (data) => {
  try {
    const { input, ctx } = data;

    const result = await availableSlotsService.getAvailableSlots({ input, ctx });
    parentPort?.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort?.postMessage({
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error"),
    });
  }
});
