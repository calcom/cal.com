import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { CalendarsTriggerTasker as BaseCalendarsTriggerTasker } from "@calcom/platform-libraries/calendars";

@Injectable()
export class CalendarsTriggerTaskerService extends BaseCalendarsTriggerTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
