import { createContainer } from "@evyweb/ioctopus";

import type { GoogleCalendarTasker } from "@calcom/features/tasker/calendars/GoogleCalendarTasker";

import { googleCalendarSyncTaskerModule } from "../modules/GoogleCalendarSyncTasker";
import { googleCalendarTaskerModule } from "../modules/GoogleCalendarTasker";
import { googleCalendarTriggerDevTaskerModule } from "../modules/GoogleCalendarTriggerDevTasker";
import { loggerModule } from "../modules/Logger";
import { DI_TOKENS } from "../tokens";

const container = createContainer();
container.load(DI_TOKENS.LOGGER_MODULE, loggerModule);
container.load(DI_TOKENS.GOOGLE_CALENDAR_SYNC_TASKER_MODULE, googleCalendarSyncTaskerModule);
container.load(DI_TOKENS.GOOGLE_CALENDAR_TRIGGER_DEV_TASKER_MODULE, googleCalendarTriggerDevTaskerModule);
container.load(DI_TOKENS.GOOGLE_CALENDAR_TASKER_MODULE, googleCalendarTaskerModule);

export function getGoogleCalendarTasker() {
  return container.get<GoogleCalendarTasker>(DI_TOKENS.GOOGLE_CALENDAR_TASKER);
}
