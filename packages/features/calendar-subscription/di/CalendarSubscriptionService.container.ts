import { createContainer } from "@calcom/features/di/di";
import {
  type CalendarSubscriptionService,
  moduleLoader as calendarSubscriptionServiceModuleLoader,
} from "./CalendarSubscriptionService.module";

const container = createContainer();

export function getCalendarSubscriptionService(): CalendarSubscriptionService {
  calendarSubscriptionServiceModuleLoader.loadModule(container);
  return container.get<CalendarSubscriptionService>(calendarSubscriptionServiceModuleLoader.token);
}
