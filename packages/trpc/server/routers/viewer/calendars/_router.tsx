import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZConnectedCalendarsInputSchema } from "./connectedCalendars.schema";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";
import { ZUpdateDestinationCalendarReminderInputSchema } from "./setDestinationReminder.schema";

type CalendarsRouterHandlerCache = {
  connectedCalendars?: typeof import("./connectedCalendars.handler").connectedCalendarsHandler;
  setDestinationCalendar?: typeof import("./setDestinationCalendar.handler").setDestinationCalendarHandler;
  deleteCache?: typeof import("./deleteCache.handler").deleteCacheHandler;
  setDestinationReminder?: typeof import("./setDestinationReminder.handler").setDestinationReminderHandler;
};

const handlerCache: CalendarsRouterHandlerCache = {};

export const calendarsRouter = router({
  connectedCalendars: authedProcedure.input(ZConnectedCalendarsInputSchema).query(async ({ ctx, input }) => {
    if (!handlerCache.connectedCalendars) {
      const { connectedCalendarsHandler } = await import("./connectedCalendars.handler");
      handlerCache.connectedCalendars = connectedCalendarsHandler;
    }
    return handlerCache.connectedCalendars({ ctx, input });
  }),

  setDestinationCalendar: authedProcedure
    .input(ZSetDestinationCalendarInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!handlerCache.setDestinationCalendar) {
        const { setDestinationCalendarHandler } = await import("./setDestinationCalendar.handler");
        handlerCache.setDestinationCalendar = setDestinationCalendarHandler;
      }
      return handlerCache.setDestinationCalendar({ ctx, input });
    }),

  deleteCache: authedProcedure
    .input(z.object({ credentialId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!handlerCache.deleteCache) {
        const { deleteCacheHandler } = await import("./deleteCache.handler");
        handlerCache.deleteCache = deleteCacheHandler;
      }
      return handlerCache.deleteCache({ ctx, input });
    }),

  setDestinationReminder: authedProcedure
    .input(ZUpdateDestinationCalendarReminderInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!handlerCache.setDestinationReminder) {
        const { setDestinationReminderHandler } = await import("./setDestinationReminder.handler");
        handlerCache.setDestinationReminder = setDestinationReminderHandler;
      }

      return handlerCache.setDestinationReminder({ ctx, input });
    }),
});
