import type logger from "@calcom/lib/logger";

import type { QueuedFormResponseRepositoryInterface } from "../../repository/QueuedFormResponseRepository.interface";

interface Dependencies {
  logger: typeof logger;
  queuedFormResponseRepo: QueuedFormResponseRepositoryInterface;
}

interface CleanupConfig {
  olderThanHours?: number;
  batchSize?: number;
}

export class QueuedFormResponseService {
  constructor(private readonly deps: Dependencies) {}

  /**
   * Calculate the cutoff time for expired responses
   * This is business logic that determines when a response is considered expired
   */
  private calculateExpiryTime(olderThanHours: number): Date {
    return new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  }

  /**
   * Clean up expired queued form responses in batches
   */
  async cleanupExpiredResponses(config: CleanupConfig = {}): Promise<{
    count: number;
    batches: number;
  }> {
    const { olderThanHours = 1, batchSize = 1000 } = config;

    const log = this.deps.logger.getSubLogger({
      prefix: ["[QueuedFormResponseService]", "cleanupExpiredResponses"],
    });

    const cutoffTime = this.calculateExpiryTime(olderThanHours);
    log.debug(`Starting cleanup for responses older than ${cutoffTime.toISOString()}`);

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        // Find expired responses in this batch
        const expiredResponses = await this.deps.queuedFormResponseRepo.findExpiredResponses({
          cutoffTime,
          take: batchSize,
        });

        if (expiredResponses.length === 0) {
          hasMore = false;
          break;
        }

        // Extract IDs for deletion
        const idsToDelete = expiredResponses.map((r) => r.id);

        // Delete this batch
        const deleteResult = await this.deps.queuedFormResponseRepo.deleteByIds(idsToDelete);

        totalDeleted += deleteResult.count;
        batchCount++;

        log.info(`Batch ${batchCount}: Deleted ${deleteResult.count} records. Total: ${totalDeleted}`);

        // If we found fewer records than the batch size, we're done
        if (expiredResponses.length < batchSize) {
          hasMore = false;
        }

        // Add a small delay between batches to reduce database load
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        log.error(`Error processing batch ${batchCount + 1}:`, error);
        throw error;
      }
    }

    log.info(`Cleanup completed. Total deleted: ${totalDeleted}, Batches: ${batchCount}`);

    return {
      count: totalDeleted,
      batches: batchCount,
    };
  }

  /**
   * Find a queued form response by ID
   */
  async findById(id: string) {
    return await this.deps.queuedFormResponseRepo.findById(id);
  }

  /**
   * Create a new queued form response
   */
  async create(data: { formId: string; response: unknown; chosenRouteId: string | null }) {
    const log = this.deps.logger.getSubLogger({
      prefix: ["[QueuedFormResponseService]", "create"],
    });

    log.info(`Creating queued form response for form ${data.formId}`);

    return await this.deps.queuedFormResponseRepo.create(data);
  }

  /**
   * Find a queued form response by ID including the form data
   */
  async findByIdIncludeForm(id: string) {
    return await this.deps.queuedFormResponseRepo.findByIdIncludeForm(id);
  }
}

