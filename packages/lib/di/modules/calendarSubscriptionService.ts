import { createModule } from "@evyweb/ioctopus";

import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/calendar-cache-sql.service";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

export const calendarCacheSqlServiceModule = createModule();
calendarCacheSqlServiceModule
  .bind(DI_TOKENS.CALENDAR_CACHE_SQL_SERVICE)
  .toClass(CalendarCacheSqlService, [
    DI_TOKENS.CALENDAR_SUBSCRIPTION_REPOSITORY,
    DI_TOKENS.CALENDAR_EVENT_REPOSITORY,
  ]);
