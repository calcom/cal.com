import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZGetTeamScheduleInputSchema } from "./getTeamSchedule.schema";

type SlotsRouterHandlerCache = {
  getTeamSchedule?: typeof import("./getTeamSchedule.handler").getTeamScheduleHandler;
};

/** This should be called getAvailableSlots */
export const highPerfRouter = router({
  getTeamSchedule: publicProcedure.input(ZGetTeamScheduleInputSchema).query(async ({ input, ctx }) => {
    const { getTeamScheduleHandler } = await import("./getTeamSchedule.handler");

    return getTeamScheduleHandler({
      ctx,
      input,
    });
  }),
});
