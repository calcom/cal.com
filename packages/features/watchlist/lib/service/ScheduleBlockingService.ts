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

  async blockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmailDomain(normalizedDomain),
      this.deps.secondaryEmailRepo.findUserIdsByEmailDomain(normalizedDomain),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIds, true);
  }

  async blockSchedulesByDomains(domains: string[]): Promise<{ count: number }> {
    if (domains.length === 0) return { count: 0 };

    const normalizedDomains = domains.map((d) => d.toLowerCase());

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmailDomains(normalizedDomains),
      this.deps.secondaryEmailRepo.findUserIdsByEmailDomains(normalizedDomains),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIds, true);
  }

  async unblockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmail(normalizedEmail),
      this.deps.secondaryEmailRepo.findUserIdsByEmail(normalizedEmail),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    // Get user emails to check if still blocked
    const userEmails = await this.deps.userRepo.findUserEmailsByIds(userIds);

    const userIdsToUnblock: number[] = [];
    for (let i = 0; i < userEmails.length; i++) {
      const userEmail = userEmails[i];
      const domain = userEmail.split("@")[1];
      const stillBlocked = await this.deps.watchlistRepo.hasBlockingEntryForEmailOrDomain(userEmail, domain);
      if (!stillBlocked) {
        userIdsToUnblock.push(userIds[i]);
      }
    }

    if (userIdsToUnblock.length === 0) return { count: 0 };

    return this.deps.scheduleRepo.updateBlockedStatusByUserIds(userIdsToUnblock, false);
  }

  async unblockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.deps.userRepo.findUserIdsByEmailDomain(normalizedDomain),
      this.deps.secondaryEmailRepo.findUserIdsByEmailDomain(normalizedDomain),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    // Get user emails to check if still blocked
    const userEmails = await this.deps.userRepo.findUserEmailsByIds(userIds);

    const userIdsToUnblock: number[] = [];
    for (let i = 0; i < userEmails.length; i++) {
      const userEmail = userEmails[i];
      const emailDomain = userEmail.split("@")[1];
      const stillBlocked = await this.deps.watchlistRepo.hasBlockingEntryForEmailOrDomain(
        userEmail,
        emailDomain
      );
      if (!stillBlocked) {
        userIdsToUnblock.push(userIds[i]);
      }
    }

    if (userIdsToUnblock.length === 0) return { count: 0 };

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
