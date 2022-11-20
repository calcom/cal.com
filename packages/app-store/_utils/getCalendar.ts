import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";
import { CredentialPayload } from "@calcom/types/Credential";

import appStore from "..";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendar = (credential: CredentialPayload | null): Calendar | null => {
  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType === "sendgrid_other_calendar") {
    calendarType = "sendgrid";
  }
  const calendarApp = appStore[calendarType.split("_").join("") as keyof typeof appStore];
  if (!(calendarApp && "lib" in calendarApp && "CalendarService" in calendarApp.lib)) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  const CalendarService = calendarApp.lib.CalendarService;
  return new CalendarService(credential);
};
