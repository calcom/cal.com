import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZCalendarOverlayInputSchema } from "./calendarOverlay.schema";
import { ZListTeamAvailaiblityScheme } from "./listTeamAvailability.schema";
import { ZUserInputSchema } from "./user.schema";

export const availabilityQueriesRouter = router({
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
    const { listTeamAvailabilityHandler } = await import("./listTeamAvailability.handler");

    return listTeamAvailabilityHandler({
      ctx,
      input,
    });
  }),
  calendarOverlay: authedProcedure.input(ZCalendarOverlayInputSchema).query(async ({ ctx, input }) => {
    const { calendarOverlayHandler } = await import("./calendarOverlay.handler");

    return calendarOverlayHandler({
      ctx,
      input,
    });
  }),
});
