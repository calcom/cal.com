import { WatchlistType } from "@calcom/prisma/enums";

import type { IScheduleBlockingRepository } from "../repository/IScheduleBlockingRepository";

/**
 * Service to manage schedule blocking when users are added/removed from watchlist.
 * When a user is blocked via watchlist, their schedules are marked as blockedByWatchlist=true,
 * causing them to return empty availability. This allows blocked users to be gracefully
 * excluded from team events (e.g., Round Robin) instead of causing booking failures.
 */
export class ScheduleBlockingService {
  constructor(private readonly scheduleBlockingRepo: IScheduleBlockingRepository) {}

  /**
   * Block all schedules for users matching the given email.
   */
  async blockSchedulesByEmail(email: string): Promise<{ count: number }> {
    return this.scheduleBlockingRepo.blockSchedulesByEmail(email);
  }

  /**
   * Block schedules for multiple emails at once.
   */
  async blockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    return this.scheduleBlockingRepo.blockSchedulesByEmails(emails);
  }

  /**
   * Unblock schedules for users matching the given email, but only if they're
   * not blocked by any other watchlist entry (e.g., domain block).
   */
  async unblockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const userEmails = await this.scheduleBlockingRepo.findUserEmailsForEmail(email);

    if (userEmails.length === 0) return { count: 0 };

    const emailsToUnblock: string[] = [];
    for (const userEmail of userEmails) {
      const stillBlocked = await this.scheduleBlockingRepo.isUserStillBlocked(userEmail);
      if (!stillBlocked) emailsToUnblock.push(userEmail);
    }

    if (emailsToUnblock.length === 0) return { count: 0 };

    return this.scheduleBlockingRepo.unblockSchedulesByEmails(emailsToUnblock);
  }

  /**
   * Block all schedules for users with emails from the given domain.
   */
  async blockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    return this.scheduleBlockingRepo.blockSchedulesByDomain(domain);
  }

  /**
   * Unblock schedules for users with emails from the given domain, but only if they're
   * not blocked by any other watchlist entry (e.g., specific email block).
   */
  async unblockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const userEmails = await this.scheduleBlockingRepo.findUserEmailsForDomain(domain);

    if (userEmails.length === 0) return { count: 0 };

    const emailsToUnblock: string[] = [];
    for (const userEmail of userEmails) {
      const stillBlocked = await this.scheduleBlockingRepo.isUserStillBlocked(userEmail);
      if (!stillBlocked) emailsToUnblock.push(userEmail);
    }

    if (emailsToUnblock.length === 0) return { count: 0 };

    return this.scheduleBlockingRepo.unblockSchedulesByEmails(emailsToUnblock);
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
