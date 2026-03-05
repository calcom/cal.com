import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZUnifiedCalendarListInputSchema, ZUnifiedCalendarListOutputSchema } from "./list.schema";
import { ZToggleCalendarSyncInputSchema, ZToggleCalendarSyncOutputSchema } from "./toggleCalendarSync.schema";

export const unifiedCalendarRouter = router({
  list: authedProcedure
    .input(ZUnifiedCalendarListInputSchema)
    .output(ZUnifiedCalendarListOutputSchema)
    .query(async ({ ctx, input }) => {
      const { listUnifiedCalendarHandler } = await import("./list.handler");
      return listUnifiedCalendarHandler({ ctx, input });
    }),
  toggleCalendarSync: authedProcedure
    .input(ZToggleCalendarSyncInputSchema)
    .output(ZToggleCalendarSyncOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { toggleCalendarSyncHandler } = await import("./toggleCalendarSync.handler");
      return toggleCalendarSyncHandler({ ctx, input });
    }),
});
