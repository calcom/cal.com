import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";

export interface CalendarCacheSqlCleanupServiceDependencies {
  eventRepo: ICalendarEventRepository;
  logger: {
    info: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
  };
}

export class CalendarCacheSqlCleanupService {
  constructor(private dependencies: CalendarCacheSqlCleanupServiceDependencies) {}

  async runCleanup(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    const { eventRepo, logger } = this.dependencies;

    try {
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
