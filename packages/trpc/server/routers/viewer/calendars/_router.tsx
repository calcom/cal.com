import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZConnectedCalendarsInputSchema } from "./connectedCalendars.schema";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

type CalendarsRouterHandlerCache = {
  connectedCalendars?: typeof import("./connectedCalendars.handler").connectedCalendarsHandler;
  setDestinationCalendar?: typeof import("./setDestinationCalendar.handler").setDestinationCalendarHandler;
};

export const calendarsRouter = router({
  connectedCalendars: authedProcedure.input(ZConnectedCalendarsInputSchema).query(async ({ ctx, input }) => {
    const { connectedCalendarsHandler } = await import("./connectedCalendars.handler");

    return connectedCalendarsHandler({ ctx, input });
  }),

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
