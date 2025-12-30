import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type { IScheduleBlockingRepository } from "./IScheduleBlockingRepository";

/**
 * Prisma implementation of the schedule blocking repository.
 * Handles all database operations for blocking/unblocking user schedules.
 */
export class PrismaScheduleBlockingRepository implements IScheduleBlockingRepository {
  constructor(private readonly prisma: PrismaClient) {}

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

  async unblockSchedulesByEmails(emails: string[]): Promise<{ count: number }> {
    if (emails.length === 0) return { count: 0 };

    const result = await this.prisma.schedule.updateMany({
      where: {
        user: {
          email: { in: emails },
        },
      },
      data: {
        blockedByWatchlist: false,
      },
    });

    return { count: result.count };
  }

  async findUserEmailsForEmail(email: string): Promise<string[]> {
    const normalizedEmail = email.toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        OR: [{ email: normalizedEmail }, { secondaryEmails: { some: { email: normalizedEmail } } }],
      },
      select: { email: true },
    });

    return users.map((u) => u.email);
  }

  async findUserEmailsForDomain(domain: string): Promise<string[]> {
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

  async isUserStillBlocked(userEmail: string): Promise<boolean> {
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
}
