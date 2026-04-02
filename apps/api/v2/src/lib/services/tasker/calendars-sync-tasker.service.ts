import { CalendarsSyncTasker as BaseCalendarsSyncTasker } from "@calcom/platform-libraries/calendars";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { CalendarsTaskService } from "@/lib/services/tasker/calendars-task.service";

@Injectable()
export class CalendarsSyncTaskerService extends BaseCalendarsSyncTasker {
  constructor(calendarsTaskService: CalendarsTaskService, logger: Logger) {
    super({
      logger,
      calendarsTaskService,
    });
  }
}
