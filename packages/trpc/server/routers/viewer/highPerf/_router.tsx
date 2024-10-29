import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZGetTeamScheduleInputSchema } from "./getTeamSchedule.schema";

type SlotsRouterHandlerCache = {
  getTeamSchedule?: typeof import("./getTeamSchedule.handler").getTeamScheduleHandler;
};

const UNSTABLE_HANDLER_CACHE: SlotsRouterHandlerCache = {};

/** This should be called getAvailableSlots */
export const highPerfRouter = router({
  getTeamSchedule: publicProcedure.input(ZGetTeamScheduleInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getTeamSchedule) {
      UNSTABLE_HANDLER_CACHE.getTeamSchedule = await import("./getTeamSchedule.handler").then(
        (mod) => mod.getTeamScheduleHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getTeamSchedule) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getTeamSchedule({
      ctx,
      input,
    });
  }),
});
