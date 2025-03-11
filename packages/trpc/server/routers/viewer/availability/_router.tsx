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
const QUERY_TO_HANDLER_MAP = {
  list: "./list.handler",
  user: "./user.handler",
  listTeam: "./team/listTeamAvailability.handler",
  calendarOverlay: "./calendarOverlay.handler",
};
const handlerContext = require.context("./", false, /\.handler$/);

export const availabilityRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await handlerContext(QUERY_TO_HANDLER_MAP[ctx.req.query.trpc])
        .listHandler;
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
      UNSTABLE_HANDLER_CACHE.user = await handlerContext(QUERY_TO_HANDLER_MAP[ctx.req.query.trpc])
        .userHandler;
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
      UNSTABLE_HANDLER_CACHE.listTeamAvailability = await handlerContext(
        QUERY_TO_HANDLER_MAP[ctx.req.query.trpc]
      ).listTeamAvailabilityHandler;
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
      UNSTABLE_HANDLER_CACHE.calendarOverlay = await handlerContext(QUERY_TO_HANDLER_MAP[ctx.req.query.trpc])
        .calendarOverlayHandler;
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
