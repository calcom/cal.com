import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistSource } from "@calcom/prisma/enums";

import type {
  IWatchlistWriteRepository,
  CreateWatchlistInput,
  UpdateWatchlistInput,
} from "../interface/IWatchlistRepositories";
import type { Watchlist } from "../types";

export class PrismaWatchlistWriteRepository implements IWatchlistWriteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEntry(data: CreateWatchlistInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.create({
        data: {
          type: data.type,
          value: data.value.toLowerCase(),
          description: data.description,
          isGlobal: data.isGlobal ?? false,
          organizationId: data.organizationId ?? null,
          action: data.action || WatchlistAction.REPORT,
          source: data.source || WatchlistSource.MANUAL,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await this.prisma.watchlist.delete({
        where: { id },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.update({
        where: { id },
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
}
