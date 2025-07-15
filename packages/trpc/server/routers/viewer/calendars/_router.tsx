import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZConnectedCalendarsInputSchema } from "./connectedCalendars.schema";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

type CalendarsRouterHandlerCache = {
  connectedCalendars?: typeof import("./connectedCalendars.handler").connectedCalendarsHandler;
  setDestinationCalendar?: typeof import("./setDestinationCalendar.handler").setDestinationCalendarHandler;
  cacheStatus?: typeof import("./cacheStatus.handler").cacheStatusHandler;
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

  cacheStatus: authedProcedure
    .input(
      z.object({
        credentialIds: z.array(z.number()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cacheStatusHandler } = await import("./cacheStatus.handler");

      return cacheStatusHandler({ ctx, input });
    }),
});
