import type { PrismaClient } from "@calcom/prisma";
import { WatchlistSource } from "@calcom/prisma/enums";

import type {
  IWatchlistRepository,
  CreateWatchlistInput,
  CheckWatchlistInput,
  WatchlistEntry,
} from "./watchlist.interface";

export class WatchlistRepository implements IWatchlistRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createEntry(params: CreateWatchlistInput): Promise<{ id: string }> {
    const existing = await this.checkExists({
      type: params.type,
      value: params.value,
      organizationId: params.organizationId,
    });

    if (existing) {
      throw new Error("Watchlist entry already exists for this organization");
    }

    const watchlist = await this.prismaClient.watchlist.create({
      data: {
        type: params.type,
        value: params.value,
        organizationId: params.organizationId,
        action: params.action,
        description: params.description,
        source: WatchlistSource.MANUAL,
        isGlobal: false,
      },
      select: { id: true },
    });

    await this.prismaClient.watchlistAudit.create({
      data: {
        watchlistId: watchlist.id,
        type: params.type,
        value: params.value,
        description: params.description,
        action: params.action,
        changedByUserId: params.userId,
      },
    });

    return watchlist;
  }

  async checkExists(params: CheckWatchlistInput): Promise<WatchlistEntry | null> {
    const entry = await this.prismaClient.watchlist.findUnique({
      where: {
        type_value_organizationId: {
          type: params.type,
          value: params.value,
          organizationId: params.organizationId,
        },
      },
    });

    return entry;
  }
}
