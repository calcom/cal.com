import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { GoogleCalendarTasker as BaseGoogleCalendarTasker } from "@calcom/platform-libraries/taskers";

import { GoogleCalendarSyncTasker } from "./google-calendar-sync-tasker.service";
import { GoogleCalendarTriggerDevTasker } from "./google-calendar-trigger-tasker.service";

@Injectable()
export class GoogleCalendarTasker extends BaseGoogleCalendarTasker {
  constructor(
    primaryTasker: GoogleCalendarTriggerDevTasker,
    fallbackTasker: GoogleCalendarSyncTasker,
    logger: Logger
  ) {
    super({
      primaryTasker: primaryTasker,
      fallbackTasker: fallbackTasker,
      logger,
    });
  }
}
