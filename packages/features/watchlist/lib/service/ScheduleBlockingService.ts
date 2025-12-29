import type { PrismaClient } from "@calcom/prisma";
import { WatchlistType } from "@calcom/prisma/enums";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["ScheduleBlockingService"] });

/**
 * Service to manage schedule blocking when users are added/removed from watchlist.
 * When a user is blocked via watchlist, their schedules are marked as blockedByWatchlist=true,
 * causing them to return empty availability. This allows blocked users to be gracefully
 * excluded from team events (e.g., Round Robin) instead of causing booking failures.
 */
export class ScheduleBlockingService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Block all schedules for users matching the given email.
   */
  async blockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          OR: [
            { email: normalizedEmail },
            { secondaryEmails: { some: { email: normalizedEmail } } },
          ],
        },
      },
      data: {
        blockedByWatchlist: true,
      },
    });

    log.info(`Blocked ${result.count} schedules for email: ${normalizedEmail}`);

    return { count: result.count };
  }

  /**
   * Block schedules for multiple emails at once.
   */
  async blockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    if (emails.length === 0) {
      return { count: 0 };
    }

    const normalizedEmails = emails.map((e) => e.toLowerCase());

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          OR: [
            { email: { in: normalizedEmails } },
            { secondaryEmails: { some: { email: { in: normalizedEmails } } } },
          ],
        },
      },
      data: {
        blockedByWatchlist: true,
      },
    });

    log.info(`Blocked ${result.count} schedules for ${normalizedEmails.length} emails`);

    return { count: result.count };
  }

  /**
   * Unblock all schedules for users matching the given email.
   */
  async unblockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          OR: [
            { email: normalizedEmail },
            { secondaryEmails: { some: { email: normalizedEmail } } },
          ],
        },
      },
      data: {
        blockedByWatchlist: false,
      },
    });

    log.info(`Unblocked ${result.count} schedules for email: ${normalizedEmail}`);

    return { count: result.count };
  }

  /**
   * Block all schedules for users with emails from the given domain.
   */
  async blockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          OR: [
            { email: { endsWith: `@${normalizedDomain}` } },
            { secondaryEmails: { some: { email: { endsWith: `@${normalizedDomain}` } } } },
          ],
        },
      },
      data: {
        blockedByWatchlist: true,
      },
    });

    log.info(`Blocked ${result.count} schedules for domain: ${normalizedDomain}`);

    return { count: result.count };
  }

  /**
   * Unblock all schedules for users with emails from the given domain.
   */
  async unblockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          OR: [
            { email: { endsWith: `@${normalizedDomain}` } },
            { secondaryEmails: { some: { email: { endsWith: `@${normalizedDomain}` } } } },
          ],
        },
      },
      data: {
        blockedByWatchlist: false,
      },
    });

    log.info(`Unblocked ${result.count} schedules for domain: ${normalizedDomain}`);

    return { count: result.count };
  }

  /**
   * Block/unblock schedules based on watchlist entry type and value.
   */
  async handleWatchlistBlock(type: WatchlistType, value: string): Promise<void> {
    if (type === WatchlistType.EMAIL) {
      await this.blockSchedulesByEmail(value);
    } else if (type === WatchlistType.DOMAIN) {
      await this.blockSchedulesByDomain(value);
    }
  }

  /**
   * Unblock schedules based on watchlist entry type and value.
   */
  async handleWatchlistUnblock(type: WatchlistType, value: string): Promise<void> {
    if (type === WatchlistType.EMAIL) {
      await this.unblockSchedulesByEmail(value);
    } else if (type === WatchlistType.DOMAIN) {
      await this.unblockSchedulesByDomain(value);
    }
  }
}
