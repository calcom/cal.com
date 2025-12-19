import logger from "@calcom/lib/logger";

/**
 * Utility class for Calendar Batch Service
 * Should serve as provide customizable config per calendar type
 */
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["CalendarBatchService"] });

export class CalendarBatchService {
  static isSupported(credential: CredentialForCalendarService): boolean {
    // only supports google calendar for now
    if (credential.type !== "google_calendar") {
      log.info("Only Google Calendar is supported");
      return false;
    }

    // only supports delegated credentials
    if (!credential.delegatedTo) {
      log.info("Only Delegated Credential is supported");
      return false;
    }

    return true;
  }
}
