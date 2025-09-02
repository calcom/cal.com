import { createModule } from "@evyweb/ioctopus";

import logger from "@calcom/lib/logger";

import type { ICalendarServiceDependencies } from "../interfaces/ICalendarServiceDependencies";
import { DI_TOKENS } from "../tokens";

export const calendarServiceModule = createModule();
calendarServiceModule.bind(DI_TOKENS.LOGGER).toValue(logger);
calendarServiceModule
  .bind(DI_TOKENS.CALENDAR_SERVICE_DEPENDENCIES)
  .toValue({ logger } as ICalendarServiceDependencies);
