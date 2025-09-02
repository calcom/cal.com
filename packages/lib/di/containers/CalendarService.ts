import { createContainer } from "@evyweb/ioctopus";

import type { ICalendarServiceDependencies } from "../interfaces/ICalendarServiceDependencies";
import { calendarServiceModule } from "../modules/CalendarService";
import { DI_TOKENS } from "../tokens";

export const calendarServiceContainer = createContainer();
calendarServiceContainer.load(DI_TOKENS.CALENDAR_SERVICE_MODULE, calendarServiceModule);

export const getCalendarServiceDependencies = (): ICalendarServiceDependencies =>
  calendarServiceContainer.get(DI_TOKENS.CALENDAR_SERVICE_DEPENDENCIES);
