import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";

import { calendarsTaskConfig } from "./config";
import { backfillGoogleCalendarEventsSchema } from "./schema";

export const BACKFILL_GOOGLE_CALENDAR_EVENTS_JOB_ID = "calendars.backfill-google-calendar-events";

export const backfillGoogleCalendarEvents: TaskWithSchema<
  typeof BACKFILL_GOOGLE_CALENDAR_EVENTS_JOB_ID,
  typeof backfillGoogleCalendarEventsSchema
> = schemaTask({
  id: BACKFILL_GOOGLE_CALENDAR_EVENTS_JOB_ID,
  ...calendarsTaskConfig,
  machine: "medium-1x",
  schema: backfillGoogleCalendarEventsSchema,
  run: async (payload: z.infer<typeof backfillGoogleCalendarEventsSchema>) => {
    const { getCalendarsTaskService } = await import(
      "@calcom/features/calendars/di/tasker/CalendarsTaskService.container"
    );

    const calendarsTaskService = getCalendarsTaskService();
    await calendarsTaskService.backfillGoogleCalendarEvents(payload);
  },
});
