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
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
    });
  }
});
