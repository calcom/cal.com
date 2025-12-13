import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import type { Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";

export class KyselyGlobalWatchlistRepository implements IGlobalWatchlistRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  private readonly selectFields = [
    "id",
    "type",
    "value",
    "description",
    "isGlobal",
    "organizationId",
    "action",
    "source",
    "lastUpdatedAt",
  ] as const;

  async findBlockedEmail(email: string): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("type", "=", WatchlistType.EMAIL)
      .where("value", "=", email)
      .where("action", "=", WatchlistAction.BLOCK)
      .where("organizationId", "is", null)
      .where("isGlobal", "=", true)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

  async findBlockedDomain(domain: string): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("type", "=", WatchlistType.DOMAIN)
      .where("value", "=", domain)
      .where("action", "=", WatchlistAction.BLOCK)
      .where("organizationId", "is", null)
      .where("isGlobal", "=", true)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

  async findFreeEmailDomain(domain: string): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("type", "=", WatchlistType.DOMAIN)
      .where("value", "=", domain)
      .where("source", "=", WatchlistSource.FREE_DOMAIN_POLICY)
      .where("organizationId", "is", null)
      .where("isGlobal", "=", true)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

  async findById(id: string): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("id", "=", id)
      .where("organizationId", "is", null)
      .where("isGlobal", "=", true)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

  async listBlockedEntries(): Promise<Watchlist[]> {
    const results = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("organizationId", "is", null)
      .where("isGlobal", "=", true)
      .where("action", "=", WatchlistAction.BLOCK)
      .execute();

    return results as Watchlist[];
  }

  async createEntry(data: {
    type: WatchlistType;
    value: string;
    description?: string;
    action: WatchlistAction;
    source?: WatchlistSource;
  }): Promise<Watchlist> {
    const result = await this.dbWrite
      .insertInto("Watchlist")
      .values({
        type: data.type,
        value: data.value,
        description: data.description ?? null,
        isGlobal: true,
        organizationId: null,
        action: data.action,
        source: data.source || WatchlistSource.MANUAL,
      })
      .returning(this.selectFields)
      .executeTakeFirstOrThrow();

    return result as Watchlist;
  }

  async updateEntry(
    id: string,
    data: {
      value?: string;
      description?: string;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    const updateData: Record<string, unknown> = {
      lastUpdatedAt: new Date(),
    };

    if (data.value !== undefined) updateData.value = data.value;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.action !== undefined) updateData.action = data.action;
    if (data.source !== undefined) updateData.source = data.source;

    const result = await this.dbWrite
      .updateTable("Watchlist")
      .set(updateData)
      .where("id", "=", id)
      .returning(this.selectFields)
      .executeTakeFirstOrThrow();

    return result as Watchlist;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.dbWrite.deleteFrom("Watchlist").where("id", "=", id).execute();
  }
}
