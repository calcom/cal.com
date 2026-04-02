import type logger from "@calcom/lib/logger";
import type { QueuedFormResponseRepositoryInterface } from "./QueuedFormResponseRepository.interface";

interface Dependencies {
  logger: typeof logger;
  queuedFormResponseRepo: QueuedFormResponseRepositoryInterface;
}

interface CleanupConfig {
  batchSize?: number;
}

export class QueuedFormResponseService {
  constructor(private readonly deps: Dependencies) {}

  private getExpiredResponses({ batchSize }: { batchSize: number }) {
    const cutoffTime = this.getExpiryCutoffTime();
    return this.deps.queuedFormResponseRepo.findMany({
      where: {
        actualResponseId: null,
        createdAt: {
          lt: cutoffTime,
        },
      },
      params: {
        take: batchSize,
      },
    });
  }
  /**
   * Calculate the cutoff time. All responses older than this time could be considered expired.
   */
  private getExpiryCutoffTime(): Date {
    const olderThanDays = 7;
    return new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  }

  /**
   * Clean up expired queued form responses in batches
   */
  async cleanupExpiredResponses(config: CleanupConfig = {}): Promise<{
    count: number;
    batches: number;
  }> {
    const { batchSize = 1000 } = config;

    const log = this.deps.logger.getSubLogger({
      prefix: ["[QueuedFormResponseService]", "cleanupExpiredResponses"],
    });

    let totalDeleted = 0;
    let batchCount = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const expiredResponses = await this.getExpiredResponses({ batchSize });

        if (expiredResponses.length === 0) {
          hasMore = false;
          break;
        }

        const idsToDelete = expiredResponses.map((r: { id: string }) => r.id);

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
}
