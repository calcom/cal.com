import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import type { Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";

export class KyselyOrganizationWatchlistRepository implements IOrganizationWatchlistRepository {
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

  async findBlockedEmail({
    email,
    organizationId,
  }: {
    email: string;
    organizationId: number;
  }): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("type", "=", WatchlistType.EMAIL)
      .where("value", "=", email)
      .where("action", "=", WatchlistAction.BLOCK)
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

  async findBlockedDomain(domain: string, organizationId: number): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("type", "=", WatchlistType.DOMAIN)
      .where("value", "=", domain)
      .where("action", "=", WatchlistAction.BLOCK)
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

  async listBlockedEntries(organizationId: number): Promise<Watchlist[]> {
    const results = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("organizationId", "=", organizationId)
      .where("action", "=", WatchlistAction.BLOCK)
      .execute();

    return results as Watchlist[];
  }

  async listAllOrganizationEntries(): Promise<Watchlist[]> {
    const results = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("organizationId", "is not", null)
      .where("isGlobal", "=", false)
      .where("action", "=", WatchlistAction.BLOCK)
      .execute();

    return results as Watchlist[];
  }

  async findById(id: string, organizationId: number): Promise<Watchlist | null> {
    const result = await this.dbRead
      .selectFrom("Watchlist")
      .select(this.selectFields)
      .where("id", "=", id)
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    return (result as Watchlist) ?? null;
  }

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
    const result = await this.dbWrite
      .insertInto("Watchlist")
      .values({
        type: data.type,
        value: data.value,
        description: data.description ?? null,
        isGlobal: false,
        organizationId,
        action: data.action,
        source: data.source || WatchlistSource.MANUAL,
      })
      .returning(this.selectFields)
      .executeTakeFirstOrThrow();

    return result as Watchlist;
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
      .where("organizationId", "=", organizationId)
      .returning(this.selectFields)
      .executeTakeFirstOrThrow();

    return result as Watchlist;
  }

  async deleteEntry(id: string, organizationId: number): Promise<void> {
    await this.dbWrite
      .deleteFrom("Watchlist")
      .where("id", "=", id)
      .where("organizationId", "=", organizationId)
      .execute();
  }
}
