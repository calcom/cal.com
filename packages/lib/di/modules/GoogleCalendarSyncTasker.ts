import { createModule } from "@evyweb/ioctopus";

import { GoogleCalendarSyncTasker } from "@calcom/features/tasker/calendars/GoogleCalendarSyncTasker";
import type { ITaskerDependencies } from "@calcom/features/tasker/types/tasker";

import { DI_TOKENS } from "../tokens";

export const googleCalendarSyncTaskerModule = createModule();
googleCalendarSyncTaskerModule.bind(DI_TOKENS.GOOGLE_CALENDAR_SYNC_TASKER).toClass(GoogleCalendarSyncTasker, {
  logger: DI_TOKENS.LOGGER,
} satisfies Record<keyof ITaskerDependencies, symbol>);
