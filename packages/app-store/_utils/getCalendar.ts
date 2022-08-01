import { Credential } from "@prisma/client";

import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";

import appStore from "..";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendar = (credential: Credential | null): Calendar | null => {
  if (!credential) return null;
  const { type: calendarType } = credential;
  const calendarApp = appStore[calendarType.split("_").join("") as keyof typeof appStore];
  if (!(calendarApp && "lib" in calendarApp && "CalendarService" in calendarApp.lib)) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  const CalendarService = calendarApp.lib.CalendarService;
  return new CalendarService(credential);
};
