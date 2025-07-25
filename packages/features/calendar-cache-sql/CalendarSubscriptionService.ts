import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type {
  GoogleChannelProps,
  ICalendarSubscriptionService,
} from "./CalendarSubscriptionService.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_WEBHOOK_URL_BASE = process.env.NEXT_PUBLIC_WEBAPP_URL;
const GOOGLE_WEBHOOK_URL = `${GOOGLE_WEBHOOK_URL_BASE}/api/webhook/google-calendar-sql`;

export class CalendarSubscriptionService implements ICalendarSubscriptionService {
  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("GOOGLE_WEBHOOK_TOKEN is not set, skipping watching calendar");
      return;
    }

    try {
      const calendarService = await getCalendar(credential);

      if (!calendarService) {
        throw new Error("Could not get calendar service");
      }

      if (!calendarService.watchCalendar) {
        throw new Error("Calendar service does not support watching calendars");
      }

      const watchResult = await calendarService.watchCalendar({
        calendarId,
        eventTypeIds: [],
      });

      if (watchResult && typeof watchResult === "object") {
        const result = watchResult as Record<string, unknown>;
        return {
          kind: typeof result.kind === "string" ? result.kind : null,
          id: typeof result.id === "string" ? result.id : null,
          resourceId: typeof result.resourceId === "string" ? result.resourceId : null,
          resourceUri: typeof result.resourceUri === "string" ? result.resourceUri : null,
          expiration: typeof result.expiration === "string" ? result.expiration : null,
        };
      }

      return {
        kind: null,
        id: null,
        resourceId: null,
        resourceUri: null,
        expiration: null,
      };
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(calendarId: string, credential: CredentialForCalendarService): Promise<void> {
    log.debug("unwatchCalendar", safeStringify({ calendarId }));

    try {
      const calendarService = await getCalendar(credential);

      if (!calendarService) {
        throw new Error("Could not get calendar service");
      }

      if (calendarService.unwatchCalendar) {
        await calendarService.unwatchCalendar({
          calendarId,
          eventTypeIds: [],
        });
      } else {
        log.info(`Calendar service does not support unwatching calendars for ${calendarId}`);
      }
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
