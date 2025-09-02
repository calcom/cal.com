import { createModule } from "@evyweb/ioctopus";

import { GoogleCalendarTasker } from "@calcom/features/tasker/calendars/GoogleCalendarTasker";
import type { ICalendarTaskerDependencies } from "@calcom/features/tasker/calendars/GoogleCalendarTasker";

import { DI_TOKENS } from "../tokens";

export const googleCalendarTaskerModule = createModule();
googleCalendarTaskerModule.bind(DI_TOKENS.GOOGLE_CALENDAR_TASKER).toClass(GoogleCalendarTasker, {
  primaryTasker: DI_TOKENS.GOOGLE_CALENDAR_TRIGGER_DEV_TASKER,
  fallbackTasker: DI_TOKENS.GOOGLE_CALENDAR_SYNC_TASKER,
  logger: DI_TOKENS.LOGGER,
} satisfies Record<keyof ICalendarTaskerDependencies, symbol>);
