import { CalendarsTriggerTasker as BaseCalendarsTriggerTasker } from "@calcom/platform-libraries/calendars";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";

@Injectable()
export class CalendarsTriggerTaskerService extends BaseCalendarsTriggerTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
