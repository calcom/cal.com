import logger from "@calcom/lib/logger";
import type { Calendar, CalendarClass } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import appStore from "..";

interface CalendarApp {
  lib: {
    CalendarService: CalendarClass;
  };
}

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

/**
 * @see [Using type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
 */
const isCalendarService = (x: unknown): x is CalendarApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "CalendarService" in x.lib;

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

  const calendarApp = await calendarAppImportFn();

  if (!isCalendarService(calendarApp)) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  log.info("Got calendarApp", calendarApp.lib.CalendarService);
  const CalendarService = calendarApp.lib.CalendarService;
  return new CalendarService(credential);
};
