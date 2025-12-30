import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type { IScheduleBlockingRepository } from "./IScheduleBlockingRepository";

/**
 * Prisma implementation of the schedule blocking repository.
 * Handles all database operations for blocking/unblocking user schedules.
 */
export class PrismaScheduleBlockingRepository implements IScheduleBlockingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async findUserIdsByPrimaryEmail(email: string): Promise<number[]> {
    const users = await this.prisma.user.findMany({
      where: { email },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async findUserIdsBySecondaryEmail(email: string): Promise<number[]> {
    const secondaryEmails = await this.prisma.secondaryEmail.findMany({
      where: { email },
      select: { userId: true },
    });
    return secondaryEmails.map((se) => se.userId);
  }

  private async findUserIdsByPrimaryEmails(emails: string[]): Promise<number[]> {
    const users = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async findUserIdsBySecondaryEmails(emails: string[]): Promise<number[]> {
    const secondaryEmails = await this.prisma.secondaryEmail.findMany({
      where: { email: { in: emails } },
      select: { userId: true },
    });
    return secondaryEmails.map((se) => se.userId);
  }

  private async findUserIdsByPrimaryEmailDomain(domain: string): Promise<number[]> {
    const users = await this.prisma.user.findMany({
      where: { email: { endsWith: `@${domain}` } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async findUserIdsBySecondaryEmailDomain(domain: string): Promise<number[]> {
    const secondaryEmails = await this.prisma.secondaryEmail.findMany({
      where: { email: { endsWith: `@${domain}` } },
      select: { userId: true },
    });
    return secondaryEmails.map((se) => se.userId);
  }

  private dedupeUserIds(primaryIds: number[], secondaryIds: number[]): number[] {
    return Array.from(new Set([...primaryIds, ...secondaryIds]));
  }

  async blockSchedulesByEmail(email: string): Promise<{ count: number }> {
    const normalizedEmail = email.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.findUserIdsByPrimaryEmail(normalizedEmail),
      this.findUserIdsBySecondaryEmail(normalizedEmail),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: { userId: { in: userIds } },
      data: { blockedByWatchlist: true },
    });

    return { count: result.count };
  }

  async blockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    if (emails.length === 0) return { count: 0 };

    const normalizedEmails = emails.map((e) => e.toLowerCase());

    const [primaryIds, secondaryIds] = await Promise.all([
      this.findUserIdsByPrimaryEmails(normalizedEmails),
      this.findUserIdsBySecondaryEmails(normalizedEmails),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: { userId: { in: userIds } },
      data: { blockedByWatchlist: true },
    });

    return { count: result.count };
  }

  async blockSchedulesByDomain(domain: string): Promise<{ count: number }> {
    const normalizedDomain = domain.toLowerCase();

    const [primaryIds, secondaryIds] = await Promise.all([
      this.findUserIdsByPrimaryEmailDomain(normalizedDomain),
      this.findUserIdsBySecondaryEmailDomain(normalizedDomain),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: { userId: { in: userIds } },
      data: { blockedByWatchlist: true },
    });

    return { count: result.count };
  }

  async unblockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    if (emails.length === 0) return { count: 0 };

    const [primaryIds, secondaryIds] = await Promise.all([
      this.findUserIdsByPrimaryEmails(emails),
      this.findUserIdsBySecondaryEmails(emails),
    ]);

    const userIds = this.dedupeUserIds(primaryIds, secondaryIds);
    if (userIds.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: { userId: { in: userIds } },
      data: { blockedByWatchlist: false },
    });

    return { count: result.count };
  }

  async findUserEmailsForEmail(email: string): Promise<string[]> {
    const normalizedEmail = email.toLowerCase();

    const [usersByPrimary, secondaryEmails] = await Promise.all([
      this.prisma.user.findMany({
        where: { email: normalizedEmail },
        select: { email: true },
      }),
      this.prisma.secondaryEmail.findMany({
        where: { email: normalizedEmail },
        select: { user: { select: { email: true } } },
      }),
    ]);

    const emails = [...usersByPrimary.map((u) => u.email), ...secondaryEmails.map((se) => se.user.email)];

    return Array.from(new Set(emails));
  }

  async findUserEmailsForDomain(domain: string): Promise<string[]> {
    const normalizedDomain = domain.toLowerCase();

    const [usersByPrimary, secondaryEmails] = await Promise.all([
      this.prisma.user.findMany({
        where: { email: { endsWith: `@${normalizedDomain}` } },
        select: { email: true },
      }),
      this.prisma.secondaryEmail.findMany({
        where: { email: { endsWith: `@${normalizedDomain}` } },
        select: { user: { select: { email: true } } },
      }),
    ]);

    const emails = [...usersByPrimary.map((u) => u.email), ...secondaryEmails.map((se) => se.user.email)];

    return Array.from(new Set(emails));
  }

  async isUserStillBlocked(userEmail: string): Promise<boolean> {
    const normalizedEmail = userEmail.toLowerCase();
    const domain = normalizedEmail.split("@")[1];

    // Check email block first
    const emailBlock = await this.prisma.watchlist.findFirst({
      where: {
        action: WatchlistAction.BLOCK,
        type: WatchlistType.EMAIL,
        value: normalizedEmail,
      },
      select: { id: true },
    });

    if (emailBlock) return true;

    // Check domain block
    const domainBlock = await this.prisma.watchlist.findFirst({
      where: {
        action: WatchlistAction.BLOCK,
        type: WatchlistType.DOMAIN,
        value: domain,
      },
      select: { id: true },
    });

    return domainBlock !== null;
  }
}
