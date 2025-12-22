import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZConnectedCalendarsInputSchema } from "./connectedCalendars.schema";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

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
});
