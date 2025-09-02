import { createModule } from "@evyweb/ioctopus";

import { GoogleCalendarTriggerDevTasker } from "@calcom/features/tasker/calendars/GoogleCalendarTriggerTasker";
import type { ITaskerDependencies } from "@calcom/features/tasker/types/tasker";

import { DI_TOKENS } from "../tokens";

export const googleCalendarTriggerDevTaskerModule = createModule();
googleCalendarTriggerDevTaskerModule
  .bind(DI_TOKENS.GOOGLE_CALENDAR_TRIGGER_DEV_TASKER)
  .toClass(GoogleCalendarTriggerDevTasker, {
    logger: DI_TOKENS.LOGGER,
  } satisfies Record<keyof ITaskerDependencies, symbol>);
