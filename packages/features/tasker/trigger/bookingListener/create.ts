import { logger, task } from "@trigger.dev/sdk/v3";

export const bookingListenerCreateTask = task({
  id: "bookingListener-create",
  run: async (payload: any, { ctx }) => {
    logger.log("This triggers", payload);
    logger.log("This triggers", ctx);

    return {
      message: "Run successfully",
    };
  },
});
