import { createModule } from "@evyweb/ioctopus";

import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/calendar-event.repository";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

export const calendarEventRepositoryModule = createModule();
calendarEventRepositoryModule
  .bind(DI_TOKENS.CALENDAR_EVENT_REPOSITORY)
  .toClass(CalendarEventRepository, [DI_TOKENS.PRISMA_CLIENT]);
