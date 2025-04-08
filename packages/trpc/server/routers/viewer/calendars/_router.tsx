import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZConnectedCalendarsInputSchema } from "./connectedCalendars.schema";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

type CalendarsRouterHandlerCache = {
  connectedCalendars?: typeof import("./connectedCalendars.handler").connectedCalendarsHandler;
  setDestinationCalendar?: typeof import("./setDestinationCalendar.handler").setDestinationCalendarHandler;
};

const UNSTABLE_HANDLER_CACHE: CalendarsRouterHandlerCache = {};

export const calendarsRouter = router({
  connectedCalendars: authedProcedure.input(ZConnectedCalendarsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.connectedCalendars) {
      UNSTABLE_HANDLER_CACHE.connectedCalendars = (
        await import("./connectedCalendars.handler")
      ).connectedCalendarsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.connectedCalendars) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.connectedCalendars({ ctx, input });
  }),

  setDestinationCalendar: authedProcedure
    .input(ZSetDestinationCalendarInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.setDestinationCalendar) {
        UNSTABLE_HANDLER_CACHE.setDestinationCalendar = (
          await import("./setDestinationCalendar.handler")
        ).setDestinationCalendarHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.setDestinationCalendar) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.setDestinationCalendar({ ctx, input });
    }),
});
