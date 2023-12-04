import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateCalendarSyncInputSchema } from "./create.schema";

type CalendarSyncRouterHandlerCache = {
  create?: typeof import("./create.handler").createHandler;
  list?: typeof import("./list.handler").listHandler;
};

const UNSTABLE_HANDLER_CACHE: CalendarSyncRouterHandlerCache = {};

export const calendarSyncRouter = router({
  create: authedProcedure.input(ZCreateCalendarSyncInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.create) {
      UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.create) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.create({
      ctx,
      input,
    });
  }),
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
});
