import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";

import type {
  IWatchlistWriteRepository,
  CreateWatchlistInput,
  UpdateWatchlistInput,
} from "../interfaces/IWatchlistRepository";
import type { Watchlist } from "../watchlist.model";

export class PrismaWatchlistWriteRepository implements IWatchlistWriteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEntry(data: CreateWatchlistInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.create({
        data: {
          type: data.type,
          value: data.value.toLowerCase(),
          description: data.description,
          organizationId: data.organizationId ?? null,
          createdById: data.createdById,
          action: "BLOCK_BOOKING", // TODO: Use enum when WatchlistAction is added to schema
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

  async updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.update({
        where: { id },
        data: {
          ...(data.value && { value: data.value.toLowerCase() }),
          ...(data.description !== undefined && { description: data.description }),
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
