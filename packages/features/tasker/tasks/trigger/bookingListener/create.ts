import { logger } from "@trigger.dev/sdk/v3";
import z from "zod";

export const bookingListenerCreateSchema = z.object({
  bookingId: z.number(),
});

export const createTask = async (payload: any) => {
  const { bookingId } = bookingListenerCreateSchema.parse(payload);

  logger.log("🚀 ~ bookingListenerCreateTask ~ payload:", bookingId);
  logger.log("This triggers", payload);

  return {
    message: "Run successfully",
  };
};
