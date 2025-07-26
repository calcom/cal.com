import { createModule } from "@evyweb/ioctopus";

import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/calendar-subscription.repository";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

export const calendarSubscriptionRepositoryModule = createModule();
calendarSubscriptionRepositoryModule
  .bind(DI_TOKENS.CALENDAR_SUBSCRIPTION_REPOSITORY)
  .toClass(CalendarSubscriptionRepository, [DI_TOKENS.PRISMA_CLIENT]);
