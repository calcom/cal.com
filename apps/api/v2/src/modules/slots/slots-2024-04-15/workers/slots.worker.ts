import { parentPort } from "worker_threads";

import { getAvailableSlots } from "@calcom/platform-libraries/slots";

parentPort?.on("message", async (data) => {
  try {
    const { input, ctx } = data;
    const result = await getAvailableSlots({ input, ctx });
    parentPort?.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort?.postMessage({
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        code: error instanceof Error && "code" in error ? (error as any).code : "INTERNAL_SERVER_ERROR",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
});
