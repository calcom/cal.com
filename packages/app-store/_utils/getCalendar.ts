import logger from "@calcom/lib/logger";
import type { Calendar, CalendarClass } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CALENDAR_SERVICES } from "../calendar.services.generated";

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
  credential: CredentialForCalendarService,
  calendarType: string
): Promise<Calendar | null> => {
  const log = logger.getSubLogger({ prefix: ["app-store", "getCalendar"] });

  if (calendarType?.endsWith("_crm")) calendarType = calendarType.split("_crm")[0];

  const factory = resolveFromRegistry(CALENDAR_SERVICES, calendarType);
  const calendarApp = factory ? await factory() : null;

  if (!calendarApp || !isCalendarService(calendarApp)) {
    // keep legacy warning patterns & null return that tests expect
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  const { CalendarService } = calendarApp.lib;
  return new CalendarService(credential);
};

const normalizeKey = (s: string) => s.replace(/[_-]/g, "").toLowerCase();
function resolveFromRegistry<T extends Record<string, any>>(registry: T, rawKey: string) {
  const want = normalizeKey(rawKey);
  const match = (Object.keys(registry) as Array<keyof T>).find((k) => normalizeKey(String(k)) === want);
  return match ? registry[match] : undefined;
}
