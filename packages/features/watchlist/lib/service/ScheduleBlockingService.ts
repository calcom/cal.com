import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

/**
 * Service to manage schedule blocking when users are added/removed from watchlist.
 * When a user is blocked via watchlist, their schedules are marked as blockedByWatchlist=true,
 * causing them to return empty availability. This allows blocked users to be gracefully
 * excluded from team events (e.g., Round Robin) instead of causing booking failures.
 */
export class ScheduleBlockingService {
  constructor(private readonly prisma: PrismaClient) {}

  private async isUserStillBlocked(userEmail: string): Promise<boolean> {
    const normalizedEmail = userEmail.toLowerCase();
    const domain = normalizedEmail.split("@")[1];

    const blockingEntry = await this.prisma.watchlist.findFirst({
      where: {
        action: WatchlistAction.BLOCK,
        OR: [
          { type: WatchlistType.EMAIL, value: normalizedEmail },
          { type: WatchlistType.DOMAIN, value: domain },
        ],
      },
      select: { id: true },
    });

    return blockingEntry !== null;
  }

  private async getUserEmailsForEmail(email: string): Promise<string[]> {
    const normalizedEmail = email.toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        OR: [{ email: normalizedEmail }, { secondaryEmails: { some: { email: normalizedEmail } } }],
      },
      select: { email: true },
    });

    return users.map((u) => u.email);
  }

  private async getUserEmailsForDomain(domain: string): Promise<string[]> {
    const normalizedDomain = domain.toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { endsWith: `@${normalizedDomain}` } },
          { secondaryEmails: { some: { email: { endsWith: `@${normalizedDomain}` } } } },
        ],
      },
      select: { email: true },
    });

    return users.map((u) => u.email);
  }

  /**
   * Block all schedules for users matching the given email.
   */
  async blockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          OR: [{ email: normalizedEmail }, { secondaryEmails: { some: { email: normalizedEmail } } }],
        },
      },
      data: {
        blockedByWatchlist: true,
      },
    });

    return { count: result.count };
  }

  /**
   * Block schedules for multiple emails at once.
   */
  async blockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    if (emails.length === 0) return { count: 0 };

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

    return { count: result.count };
  }

  /**
   * Unblock schedules for users matching the given email, but only if they're
   * not blocked by any other watchlist entry (e.g., domain block).
   */
  async unblockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const userEmails = await this.getUserEmailsForEmail(normalizedEmail);

    if (userEmails.length === 0) return { count: 0 };

    const emailsToUnblock: string[] = [];
    for (const userEmail of userEmails) {
      const stillBlocked = await this.isUserStillBlocked(userEmail);
      if (!stillBlocked) emailsToUnblock.push(userEmail);
    }

    if (emailsToUnblock.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          email: { in: emailsToUnblock },
        },
      },
      data: {
        blockedByWatchlist: false,
      },
    });

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

    return { count: result.count };
  }

  /**
   * Unblock schedules for users with emails from the given domain, but only if they're
   * not blocked by any other watchlist entry (e.g., specific email block).
   */
  async unblockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const userEmails = await this.getUserEmailsForDomain(normalizedDomain);

    if (userEmails.length === 0) return { count: 0 };

    const emailsToUnblock: string[] = [];
    for (const userEmail of userEmails) {
      const stillBlocked = await this.isUserStillBlocked(userEmail);
      if (!stillBlocked) emailsToUnblock.push(userEmail);
    }

    if (emailsToUnblock.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          email: { in: emailsToUnblock },
        },
      },
      data: {
        blockedByWatchlist: false,
      },
    });

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
