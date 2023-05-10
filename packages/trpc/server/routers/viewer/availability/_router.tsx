import { authedProcedure, router } from "../../../trpc";
import { scheduleRouter } from "./schedule/_router";
import { ZUserInputSchema } from "./user.schema";

type AvailabilityRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  user?: typeof import("./user.handler").userHandler;
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

  schedule: scheduleRouter,
});
