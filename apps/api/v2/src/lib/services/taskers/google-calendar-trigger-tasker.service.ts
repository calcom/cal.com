import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { GoogleCalendarTriggerDevTasker as BaseGoogleCalendarTriggerDevTasker } from "@calcom/platform-libraries/taskers";

@Injectable()
export class GoogleCalendarTriggerDevTasker extends BaseGoogleCalendarTriggerDevTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
