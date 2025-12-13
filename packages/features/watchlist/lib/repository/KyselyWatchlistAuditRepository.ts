import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type {
  IAuditRepository,
  CreateWatchlistAuditInput,
  UpdateWatchlistAuditInput,
} from "../interface/IAuditRepository";
import type { WatchlistAudit } from "../types";

export class KyselyWatchlistAuditRepository implements IAuditRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async create(data: CreateWatchlistAuditInput): Promise<WatchlistAudit> {
    const result = await this.dbWrite
      .insertInto("WatchlistAudit")
      .values({
        type: data.type as WatchlistType,
        value: data.value,
        description: data.description ?? null,
        action: data.action as WatchlistAction,
        changedByUserId: data.changedByUserId ?? null,
        watchlistId: data.watchlistId,
      })
      .returning([
        "id",
        "type",
        "value",
        "description",
        "action",
        "changedAt",
        "changedByUserId",
        "watchlistId",
      ])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      type: result.type as WatchlistType,
      value: result.value,
      description: result.description,
      action: result.action as WatchlistAction,
      changedAt: result.changedAt,
      changedByUserId: result.changedByUserId,
      watchlistId: result.watchlistId,
    };
  }

  async findById(id: string): Promise<WatchlistAudit | null> {
    const result = await this.dbRead
      .selectFrom("WatchlistAudit")
      .select([
        "id",
        "type",
        "value",
        "description",
        "action",
        "changedAt",
        "changedByUserId",
        "watchlistId",
      ])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      type: result.type as WatchlistType,
      value: result.value,
      description: result.description,
      action: result.action as WatchlistAction,
      changedAt: result.changedAt,
      changedByUserId: result.changedByUserId,
      watchlistId: result.watchlistId,
    };
  }

  async findByWatchlistId(watchlistId: string): Promise<WatchlistAudit[]> {
    const results = await this.dbRead
      .selectFrom("WatchlistAudit")
      .select([
        "id",
        "type",
        "value",
        "description",
        "action",
        "changedAt",
        "changedByUserId",
        "watchlistId",
      ])
      .where("watchlistId", "=", watchlistId)
      .orderBy("changedAt", "desc")
      .execute();

    return results.map((row) => ({
      id: row.id,
      type: row.type as WatchlistType,
      value: row.value,
      description: row.description,
      action: row.action as WatchlistAction,
      changedAt: row.changedAt,
      changedByUserId: row.changedByUserId,
      watchlistId: row.watchlistId,
    }));
  }

  async update(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit> {
    const updateData: Record<string, unknown> = {};

    if (data.type !== undefined) {
      updateData.type = data.type as WatchlistType;
    }
    if (data.value !== undefined) {
      updateData.value = data.value;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.action !== undefined) {
      updateData.action = data.action as WatchlistAction;
    }
    if (data.changedByUserId !== undefined) {
      updateData.changedByUserId = data.changedByUserId;
    }

    const result = await this.dbWrite
      .updateTable("WatchlistAudit")
      .set(updateData)
      .where("id", "=", id)
      .returning([
        "id",
        "type",
        "value",
        "description",
        "action",
        "changedAt",
        "changedByUserId",
        "watchlistId",
      ])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      type: result.type as WatchlistType,
      value: result.value,
      description: result.description,
      action: result.action as WatchlistAction,
      changedAt: result.changedAt,
      changedByUserId: result.changedByUserId,
      watchlistId: result.watchlistId,
    };
  }

  async delete(id: string): Promise<void> {
    await this.dbWrite.deleteFrom("WatchlistAudit").where("id", "=", id).execute();
  }

  async findMany(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]> {
    let query = this.dbRead
      .selectFrom("WatchlistAudit")
      .select([
        "id",
        "type",
        "value",
        "description",
        "action",
        "changedAt",
        "changedByUserId",
        "watchlistId",
      ])
      .orderBy("changedAt", "desc");

    if (filters?.watchlistId) {
      query = query.where("watchlistId", "=", filters.watchlistId);
    }

    if (filters?.changedByUserId) {
      query = query.where("changedByUserId", "=", filters.changedByUserId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const results = await query.execute();

    return results.map((row) => ({
      id: row.id,
      type: row.type as WatchlistType,
      value: row.value,
      description: row.description,
      action: row.action as WatchlistAction,
      changedAt: row.changedAt,
      changedByUserId: row.changedByUserId,
      watchlistId: row.watchlistId,
    }));
  }
}
