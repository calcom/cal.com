import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZUnifiedCalendarListInputSchema, ZUnifiedCalendarListOutputSchema } from "./list.schema";
import { ZToggleCalendarSyncInputSchema, ZToggleCalendarSyncOutputSchema } from "./toggleCalendarSync.schema";

type UnifiedCalendarRouterHandlerCache = {
  list?: typeof import("./list.handler").listUnifiedCalendarHandler;
  toggleCalendarSync?: typeof import("./toggleCalendarSync.handler").toggleCalendarSyncHandler;
};

const UNSTABLE_HANDLER_CACHE: UnifiedCalendarRouterHandlerCache = {};

export const unifiedCalendarRouter = router({
  list: authedProcedure
    .input(ZUnifiedCalendarListInputSchema)
    .output(ZUnifiedCalendarListOutputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.list) {
        UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then(
          (mod) => mod.listUnifiedCalendarHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.list) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.list({ ctx, input });
    }),

  toggleCalendarSync: authedProcedure
    .input(ZToggleCalendarSyncInputSchema)
    .output(ZToggleCalendarSyncOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.toggleCalendarSync) {
        UNSTABLE_HANDLER_CACHE.toggleCalendarSync = await import("./toggleCalendarSync.handler").then(
          (mod) => mod.toggleCalendarSyncHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.toggleCalendarSync) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.toggleCalendarSync({ ctx, input });
    }),
});
