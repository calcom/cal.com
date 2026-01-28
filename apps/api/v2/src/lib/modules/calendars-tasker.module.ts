import { Module, Scope } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { CalendarsSyncTaskerService } from "@/lib/services/tasker/calendars-sync-tasker.service";
import { CalendarsTaskService } from "@/lib/services/tasker/calendars-task.service";
import { CalendarsTasker } from "@/lib/services/tasker/calendars-tasker.service";
import { CalendarsTriggerTaskerService } from "@/lib/services/tasker/calendars-trigger-tasker.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    CalendarsTaskService,
    CalendarsSyncTaskerService,
    CalendarsTriggerTaskerService,
    CalendarsTasker,
  ],
  exports: [CalendarsTasker],
})
export class CalendarsTaskerModule {}
