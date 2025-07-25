import { createModule } from "@evyweb/ioctopus";

import { CalendarSubscriptionService } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionService";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

export const calendarSubscriptionServiceModule = createModule();
calendarSubscriptionServiceModule
  .bind(DI_TOKENS.CALENDAR_SUBSCRIPTION_SERVICE)
  .toClass(CalendarSubscriptionService, []);
