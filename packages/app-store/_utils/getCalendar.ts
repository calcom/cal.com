import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import appStore from "..";

interface CalendarApp {
  lib?: {
    CalendarService: any;
  };
}

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendar = async (credential: CredentialPayload | null): Promise<Calendar | null> => {
  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType?.endsWith("_other_calendar")) {
    calendarType = calendarType.split("_other_calendar")[0];
  }
  const calendarAppImportFn = appStore[calendarType.split("_").join("") as keyof typeof appStore];

  if (!calendarAppImportFn) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  const calendarApp = (await calendarAppImportFn()) as CalendarApp;

  if (!calendarApp.lib?.CalendarService) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  log.info("calendarApp", calendarApp.lib.CalendarService);
  const CalendarService = calendarApp.lib.CalendarService;
  return new CalendarService(credential);
};
