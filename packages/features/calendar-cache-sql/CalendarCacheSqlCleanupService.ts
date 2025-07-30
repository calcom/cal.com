import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";

export interface CalendarCacheSqlCleanupServiceDependencies {
  eventRepo: ICalendarEventRepository;
  featuresRepo: IFeaturesRepository;
  logger: {
    info: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
  };
}

export class CalendarCacheSqlCleanupService {
  constructor(private dependencies: CalendarCacheSqlCleanupServiceDependencies) {}

  async runCleanup(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    const { eventRepo, featuresRepo, logger } = this.dependencies;

    try {
      const isCleanupEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally(
        "calendar-cache-sql-cleanup"
      );

      if (!isCleanupEnabled) {
        logger.debug("Calendar cache SQL cleanup not enabled globally");
        return { success: true };
      }

      logger.info("Starting calendar cache SQL cleanup");

      await eventRepo.cleanupOldEvents();

      logger.info("Calendar cache SQL cleanup completed successfully");

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Calendar cache SQL cleanup failed", { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
}
