import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ApiLogsService } from "./api-logs.service";

@Injectable()
export class ApiLogsCleanupService {
  private readonly logger = new Logger(ApiLogsCleanupService.name);
  private readonly retentionDays = parseInt(process.env.API_LOGS_RETENTION_DAYS || "30", 10);

  constructor(private readonly apiLogsService: ApiLogsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log(`Starting API logs cleanup (retention: ${this.retentionDays} days)`);
    
    try {
      const result = await this.apiLogsService.cleanup(this.retentionDays);
      this.logger.log(`Cleanup completed: ${result.count} logs deleted`);
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
    }
  }
}
