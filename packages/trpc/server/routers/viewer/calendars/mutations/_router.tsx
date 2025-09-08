import { z } from "zod";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

export const calendarsMutationsRouter = router({
  setDestinationCalendar: authedProcedure
    .input(ZSetDestinationCalendarInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { setDestinationCalendarHandler } = await import("./setDestinationCalendar.handler");

      return setDestinationCalendarHandler({ ctx, input });
    }),

  deleteCache: authedProcedure
    .input(z.object({ credentialId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteCacheHandler } = await import("./deleteCache.handler");
      return deleteCacheHandler({ ctx, input });
    }),
});
