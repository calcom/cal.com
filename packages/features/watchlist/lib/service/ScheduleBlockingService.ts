import type { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import type { SecondaryEmailRepository } from "@calcom/features/users/repositories/SecondaryEmailRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WatchlistType } from "@calcom/prisma/enums";

import type { WatchlistRepository } from "../repository/WatchlistRepository";

interface ScheduleBlockingServiceDeps {
  userRepo: UserRepository;
  secondaryEmailRepo: SecondaryEmailRepository;
  scheduleRepo: ScheduleRepository;
  watchlistRepo: WatchlistRepository;
}

/**
 * Service to manage schedule blocking when users are added/removed from watchlist.
 * When a user is blocked via watchlist, their schedules are marked as blockedByWatchlist=true,
 * causing them to return empty availability. This allows blocked users to be gracefully
 * excluded from team events (e.g., Round Robin) instead of causing booking failures.
 */
export class ScheduleBlockingService {
  constructor(private readonly deps: ScheduleBlockingServiceDeps) {}

  private dedupeUserIds(primaryIds: number[], secondaryIds: number[]): number[] {
    return Array.from(new Set([...primaryIds, ...secondaryIds]));
  }

  async blockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmail(normalizedEmail),
      this.deps.secondaryEmailRepo.findUserIdsByEmail(normalizedEmail),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIds, true);
  }

  async blockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    if (emails.length === 0) return { count: 0 };

    const normalizedEmails = emails.map((e) => e.toLowerCase());

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmails(normalizedEmails),
      this.deps.secondaryEmailRepo.findUserIdsByEmails(normalizedEmails),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIds, true);
  }

  /**
   * Block schedules for all users matching a domain.
   * Uses DB-side subquery to avoid materializing large user ID arrays.
   */
  async blockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    return this.deps.scheduleRepo.updateBlockedStatusByDomain(domain, true);
  }

  /**
   * Block schedules for all users matching multiple domains.
   * Uses DB-side subquery to avoid materializing large user ID arrays.
   */
  async blockSchedulesByDomains(domains: string[]): Promise<{ count: number }> {
    return this.deps.scheduleRepo.updateBlockedStatusByDomains(domains, true);
  }

  /**
   * Unblock schedules for a specific email, but only if no other blocking entries exist.
   * Uses batch lookup to avoid N+1 queries.
   */
  async unblockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmail(normalizedEmail),
      this.deps.secondaryEmailRepo.findUserIdsByEmail(normalizedEmail),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    // Get user emails and batch check which are still blocked
    const userEmails = await this.deps.userRepo.findUserEmailsByIds(userIds);
    const stillBlockedEmails = await this.deps.watchlistRepo.getBlockedEmails(userEmails);

    // Filter to only users who are no longer blocked
    const userIdsToUnblock = userIds.filter((_, i) => !stillBlockedEmails.has(userEmails[i].toLowerCase()));

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIdsToUnblock, false);
  }

  /**
   * Unblock schedules for all users matching a domain, but only if no other blocking entries exist.
   * Uses batch lookup to avoid N+1 queries.
   */
  async unblockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmailDomain(normalizedDomain),
      this.deps.secondaryEmailRepo.findUserIdsByEmailDomain(normalizedDomain),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    // Get user emails and batch check which are still blocked
    const userEmails = await this.deps.userRepo.findUserEmailsByIds(userIds);
    const stillBlockedEmails = await this.deps.watchlistRepo.getBlockedEmails(userEmails);

    // Filter to only users who are no longer blocked
    const userIdsToUnblock = userIds.filter((_, i) => !stillBlockedEmails.has(userEmails[i].toLowerCase()));

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIdsToUnblock, false);
  }

  async handleWatchlistBlock(type: WatchlistType, value: string): Promise<void> {
    if (type === WatchlistType.EMAIL) {
      await this.blockSchedulesByEmail(value);
    } else if (type === WatchlistType.DOMAIN) {
      await this.blockSchedulesByDomain(value);
    }
  }

  async handleWatchlistUnblock(type: WatchlistType, value: string): Promise<void> {
    if (type === WatchlistType.EMAIL) {
      await this.unblockSchedulesByEmail(value);
    } else if (type === WatchlistType.DOMAIN) {
      await this.unblockSchedulesByDomain(value);
    }
  }
}
