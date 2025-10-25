import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ApiLogsController } from "./controllers/api-logs.controller";
import { ApiLogsService } from "./services/api-logs.service";
import { ApiLogsCleanupService } from "./services/api-logs-cleanup.service";
import { ApiLogsAnalyticsService } from "./services/api-logs-analytics.service";
import { ApiLogsRepository } from "./api-logs.repository";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ApiLogsController],
  providers: [ApiLogsService, ApiLogsRepository, ApiLogsCleanupService, ApiLogsAnalyticsService],
  exports: [ApiLogsService, ApiLogsAnalyticsService],
})
export class ApiLogsModule {}
