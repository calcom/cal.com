import { captureException } from "@sentry/nextjs";

import type { PrismaClient, Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";

/**
 * Repository for organization-specific watchlist operations
 * Handles blocking rules that apply only to a specific organization
 */
export class OrganizationWatchlistRepository implements IOrganizationWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBlockedEmail({
    email,
    organizationId,
  }: {
    email: string;
    organizationId: number;
  }): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: WatchlistAction.BLOCK,
          organizationId,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findBlockedDomain(domain: string, organizationId: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          action: WatchlistAction.BLOCK,
          organizationId,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listBlockedEntries(organizationId: number): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId,
          action: WatchlistAction.BLOCK,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findById(id: string, organizationId: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findUnique({
        where: {
          id,
          organizationId,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  // Write operations for organization-specific entries
  async createEntry(
    organizationId: number,
    data: {
      type: WatchlistType;
      value: string;
      description?: string;
      action: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.create({
        data: {
          type: data.type,
          value: data.value.toLowerCase(),
          description: data.description,
          isGlobal: false,
          organizationId,
          action: data.action,
          source: data.source || WatchlistSource.MANUAL,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async updateEntry(
    id: string,
    organizationId: number,
    data: {
      value?: string;
      description?: string;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...(data.value && { value: data.value.toLowerCase() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.action && { action: data.action }),
          ...(data.source && { source: data.source }),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async deleteEntry(id: string, organizationId: number): Promise<void> {
    try {
      await this.prisma.watchlist.delete({
        where: {
          id,
          organizationId,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
