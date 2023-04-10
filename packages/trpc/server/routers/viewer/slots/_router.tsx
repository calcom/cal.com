import { router, publicProcedure } from "../../../trpc";
import { ZGetScheduleInputSchema } from "./getSchedule.schema";

type SlotsRouterHandlerCache = {
  getSchedule?: typeof import("./getSchedule.handler").getScheduleHandler;
};

const UNSTABLE_HANDLER_CACHE: SlotsRouterHandlerCache = {};

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  getSchedule: publicProcedure.input(ZGetScheduleInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getSchedule) {
      UNSTABLE_HANDLER_CACHE.getSchedule = await import("./getSchedule.handler").then(
        (mod) => mod.getScheduleHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getSchedule) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getSchedule({
      ctx,
      input,
    });
  }),
});
