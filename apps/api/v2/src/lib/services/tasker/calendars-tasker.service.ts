import { CalendarsTasker as BaseCalendarsTasker } from "@calcom/platform-libraries/calendars";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { CalendarsSyncTaskerService } from "@/lib/services/tasker/calendars-sync-tasker.service";
import { CalendarsTriggerTaskerService } from "@/lib/services/tasker/calendars-trigger-tasker.service";

@Injectable()
export class CalendarsTasker extends BaseCalendarsTasker {
  constructor(
    syncTasker: CalendarsSyncTaskerService,
    asyncTasker: CalendarsTriggerTaskerService,
    logger: Logger
  ) {
    super({
      logger,
      asyncTasker: asyncTasker,
      syncTasker: syncTasker,
    });
  }
}
