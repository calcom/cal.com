import logger from "@calcom/lib/logger";
import type { Calendar, CalendarClass } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CalendarServiceMap } from "../calendar.services.generated";

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

export const getCalendar = async (
  credential: CredentialForCalendarService | null
): Promise<Calendar | null> => {
  const perfStartTime = performance.now();
  console.log(`[PERF] getCalendar started at ${perfStartTime}ms for type: ${credential?.type}`);

  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType?.endsWith("_other_calendar")) {
    calendarType = calendarType.split("_other_calendar")[0];
  }
  // Backwards compatibility until CRM manager is created
  if (calendarType?.endsWith("_crm")) {
    calendarType = calendarType.split("_crm")[0];
  }

  const calendarStoreAccessStart = performance.now();
  const calendarAppImportFn =
    CalendarServiceMap[calendarType.split("_").join("") as keyof typeof CalendarServiceMap];
  const calendarStoreAccessEnd = performance.now();
  console.log(`[PERF] CalendarServiceMap access took ${calendarStoreAccessEnd - calendarStoreAccessStart}ms`);

  if (!calendarAppImportFn) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  const dynamicImportStart = performance.now();
  const calendarApp = await calendarAppImportFn;
  const dynamicImportEnd = performance.now();
  console.log(`[PERF] dynamic import of ${calendarType} took ${dynamicImportEnd - dynamicImportStart}ms`);

  const CalendarService = calendarApp.default;

  if (!CalendarService || typeof CalendarService !== "function") {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  log.info("Got CalendarService", CalendarService);

  const perfEndTime = performance.now();
  console.log(`[PERF] getCalendar total time: ${perfEndTime - perfStartTime}ms`);
  return new CalendarService(credential as any);
};
