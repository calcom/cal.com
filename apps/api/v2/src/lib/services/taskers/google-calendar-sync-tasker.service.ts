import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { GoogleCalendarSyncTasker as BaseGoogleCalendarSyncTasker } from "@calcom/platform-libraries/taskers";

@Injectable()
export class GoogleCalendarSyncTasker extends BaseGoogleCalendarSyncTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
