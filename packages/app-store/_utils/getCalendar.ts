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

  const calendarService = await CalendarServiceMap[
    calendarType.split("_").join("") as keyof typeof CalendarServiceMap
  ];

  if (!calendarService.default) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  // INFO: Casting this as any because unfortunately
  // the office365calendar service was changed to take different params than the rest of the services.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new calendarService.default(credential as any);
};
