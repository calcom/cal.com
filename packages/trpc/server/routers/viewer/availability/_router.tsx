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

const UNSTABLE_HANDLER_CACHE: AvailabilityRouterHandlerCache = {};

export const availabilityRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.list) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.list({
      ctx,
    });
  }),

  user: authedProcedure.input(ZUserInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.user) {
      UNSTABLE_HANDLER_CACHE.user = await import("./user.handler").then((mod) => mod.userHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.user) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.user({
      ctx,
      input,
    });
  }),
  listTeam: authedProcedure.input(ZListTeamAvailaiblityScheme).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.listTeamAvailability) {
      UNSTABLE_HANDLER_CACHE.listTeamAvailability = await import("./team/listTeamAvailability.handler").then(
        (mod) => mod.listTeamAvailabilityHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listTeamAvailability) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listTeamAvailability({
      ctx,
      input,
    });
  }),
  schedule: scheduleRouter,
  calendarOverlay: authedProcedure.input(ZCalendarOverlayInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calendarOverlay) {
      UNSTABLE_HANDLER_CACHE.calendarOverlay = await import("./calendarOverlay.handler").then(
        (mod) => mod.calendarOverlayHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.calendarOverlay) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.calendarOverlay({
      ctx,
      input,
    });
  }),
});
