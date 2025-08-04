import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCalendarOverlayInputSchema } from "./calendarOverlay.schema";
import { scheduleRouter } from "./schedule/_router";
import { ZListTeamAvailaiblityScheme } from "./team/listTeamAvailability.schema";
import { ZUserInputSchema } from "./user.schema";

type AvailabilityRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  user?: typeof import("./user.handler").userHandler;
  calendarOverlay?: typeof import("./calendarOverlay.handler").calendarOverlayHandler;
  listTeamAvailability?: typeof import("./team/listTeamAvailability.handler").listTeamAvailabilityHandler;
};

export const availabilityRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
    });
  }),

  user: authedProcedure.input(ZUserInputSchema).query(async ({ ctx, input }) => {
    const { userHandler } = await import("./user.handler");

    return userHandler({
      ctx,
      input,
    });
  }),
  listTeam: authedProcedure.input(ZListTeamAvailaiblityScheme).query(async ({ ctx, input }) => {
    const { listTeamAvailabilityHandler } = await import("./team/listTeamAvailability.handler");

    return listTeamAvailabilityHandler({
      ctx,
      input,
    });
  }),
  schedule: scheduleRouter,
  calendarOverlay: authedProcedure.input(ZCalendarOverlayInputSchema).query(async ({ ctx, input }) => {
    const { calendarOverlayHandler } = await import("./calendarOverlay.handler");

    return calendarOverlayHandler({
      ctx,
      input,
    });
  }),
});
