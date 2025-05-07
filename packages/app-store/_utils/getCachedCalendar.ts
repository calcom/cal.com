import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { getCalendar } from "./getCalendar";

const log = logger.getSubLogger({ prefix: ["getCachedCalendar"] });

export const getCachedCalendar = async (credential: CredentialForCalendarService): Promise<Calendar> => {
  if (credential.type === "google_calendar") {
    try {
      const { default: CachedCalendarService } = await import(
        "@calcom/app-store/googlecalendar/lib/CachedCalendarService"
      );

      return new CachedCalendarService(credential);
    } catch (error) {
      log.error(`Error loading CachedCalendarService: ${error}`);
    }
  }

  const calendar = await getCalendar(credential);
  if (!calendar) {
    throw new Error(`Failed to get calendar for credential type: ${credential.type}`);
  }
  return calendar;
};
