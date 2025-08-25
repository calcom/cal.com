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
  credential: CredentialForCalendarService | null
): Promise<Calendar | null> => {
  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType?.endsWith("_other_calendar")) {
    calendarType = calendarType.split("_other_calendar")[0];
  }
  // Backwards compatibility until CRM manager is created
  if (calendarType?.endsWith("_crm")) {
    calendarType = calendarType.split("_crm")[0];
  }
  const slug = calendarType.replace(/[_-]/g, "").toLowerCase(); // e.g., "google_calendar" -> "googlecalendar"
  const modFactory =
    (CALENDAR_SERVICES as Record<string, any>)[slug] ??
    // legacy fallback (in case generated keys contain punctuation or old index still exists)
    (CALENDAR_SERVICES as Record<string, any>)[calendarType] ??
    null;
  const calendarApp = modFactory ? await modFactory() : null;

  if (!calendarApp?.lib?.CalendarService) {
    log.warn(`calendar of type ${slug} is not implemented`);
    return null;
  }

  const { CalendarService } = calendarApp.lib;
  return new CalendarService(credential);
};
