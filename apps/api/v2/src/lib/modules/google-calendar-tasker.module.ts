import { Logger } from "@/lib/logger.bridge";
import { GoogleCalendarSyncTasker } from "@/lib/services/taskers/google-calendar-sync-tasker.service";
import { GoogleCalendarTasker } from "@/lib/services/taskers/google-calendar-tasker.service";
import { GoogleCalendarTriggerDevTasker } from "@/lib/services/taskers/google-calendar-trigger-tasker.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [GoogleCalendarSyncTasker, GoogleCalendarTriggerDevTasker, Logger, GoogleCalendarTasker],
  exports: [GoogleCalendarTasker],
})
export class GoogleCalendarTaskerModule {}
