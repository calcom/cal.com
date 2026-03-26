import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";

import { calendarsTaskConfig } from "./config";
import { calendarsTaskSchema } from "./schema";

export const ENSURE_DEFAULT_CALENDARS_JOB_ID = "calendars.ensure-default-calendars";

export const ensureDefaultCalendars: TaskWithSchema<
  typeof ENSURE_DEFAULT_CALENDARS_JOB_ID,
  typeof calendarsTaskSchema
> = schemaTask({
  id: ENSURE_DEFAULT_CALENDARS_JOB_ID,
  ...calendarsTaskConfig,
  schema: calendarsTaskSchema,
  run: async (payload: z.infer<typeof calendarsTaskSchema>) => {
    const { getCalendarsTaskService } = await import(
      "@calcom/features/calendars/di/tasker/CalendarsTaskService.container"
    );

    const calendarsTaskService = getCalendarsTaskService();
    await calendarsTaskService.ensureDefaultCalendars(payload);
  },
});
