import { parentPort } from "worker_threads";

import { AvailableSlotsService } from "@calcom/platform-libraries/slots";

parentPort?.on("message", async (data) => {
  try {
    const { input, ctx } = data;
    const availableSlotsService = new AvailableSlotsService();

    const result = await availableSlotsService.getAvailableSlots({ input, ctx });
    parentPort?.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort?.postMessage({
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error"),
    });
  }
});
