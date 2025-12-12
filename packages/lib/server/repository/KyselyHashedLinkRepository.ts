import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  HashedLinkDto,
  HashedLinkBasicDto,
  HashedLinkWithEventTypeDto,
  HashedLinkCreateInput,
  IHashedLinkRepository,
} from "./IHashedLinkRepository";

export class KyselyHashedLinkRepository implements IHashedLinkRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async deleteLinks(eventTypeId: number, linksToDelete: string[]): Promise<void> {
    if (linksToDelete.length === 0) return;

    await this.dbWrite
      .deleteFrom("HashedLink")
      .where("eventTypeId", "=", eventTypeId)
      .where("link", "in", linksToDelete)
      .execute();
  }

  async createLink(eventTypeId: number, linkData: HashedLinkCreateInput): Promise<HashedLinkDto> {
    const result = await this.dbWrite
      .insertInto("HashedLink")
      .values({
        eventTypeId,
        link: linkData.link,
        expiresAt: linkData.expiresAt,
        maxUsageCount:
          linkData.maxUsageCount && Number.isFinite(linkData.maxUsageCount)
            ? linkData.maxUsageCount
            : null,
        usageCount: 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      link: result.link,
      eventTypeId: result.eventTypeId,
      expiresAt: result.expiresAt,
      maxUsageCount: result.maxUsageCount,
      usageCount: result.usageCount,
    };
  }

  async updateLink(eventTypeId: number, linkData: HashedLinkCreateInput): Promise<number> {
    const result = await this.dbWrite
      .updateTable("HashedLink")
      .set({
        expiresAt: linkData.expiresAt,
        ...(typeof linkData.maxUsageCount === "number" && linkData.maxUsageCount !== null
          ? { maxUsageCount: linkData.maxUsageCount }
          : {}),
      })
      .where("eventTypeId", "=", eventTypeId)
      .where("link", "=", linkData.link)
      .executeTakeFirst();

    return Number(result.numUpdatedRows);
  }

  async findLinksByEventTypeId(eventTypeId: number): Promise<HashedLinkBasicDto[]> {
    const results = await this.dbRead
      .selectFrom("HashedLink")
      .select(["link", "expiresAt", "maxUsageCount", "usageCount"])
      .where("eventTypeId", "=", eventTypeId)
      .execute();

    return results.map((row) => ({
      link: row.link,
      expiresAt: row.expiresAt,
      maxUsageCount: row.maxUsageCount,
      usageCount: row.usageCount,
    }));
  }

  async findLinkWithEventTypeDetails(linkId: string): Promise<HashedLinkWithEventTypeDto | null> {
    const result = await this.dbRead
      .selectFrom("HashedLink")
      .leftJoin("EventType", "EventType.id", "HashedLink.eventTypeId")
      .select([
        "HashedLink.id",
        "HashedLink.link",
        "HashedLink.expiresAt",
        "HashedLink.maxUsageCount",
        "HashedLink.usageCount",
        "HashedLink.eventTypeId",
        "EventType.teamId",
        "EventType.userId",
      ])
      .where("HashedLink.link", "=", linkId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      link: result.link,
      expiresAt: result.expiresAt,
      maxUsageCount: result.maxUsageCount,
      usageCount: result.usageCount,
      eventTypeId: result.eventTypeId,
      eventType:
        result.teamId !== undefined || result.userId !== undefined
          ? {
              teamId: result.teamId ?? null,
              userId: result.userId ?? null,
            }
          : null,
    };
  }

  async findLinksWithEventTypeDetails(linkIds: string[]): Promise<HashedLinkWithEventTypeDto[]> {
    if (linkIds.length === 0) return [];

    const results = await this.dbRead
      .selectFrom("HashedLink")
      .leftJoin("EventType", "EventType.id", "HashedLink.eventTypeId")
      .select([
        "HashedLink.id",
        "HashedLink.link",
        "HashedLink.expiresAt",
        "HashedLink.maxUsageCount",
        "HashedLink.usageCount",
        "HashedLink.eventTypeId",
        "EventType.teamId",
        "EventType.userId",
      ])
      .where("HashedLink.link", "in", linkIds)
      .execute();

    return results.map((result) => ({
      id: result.id,
      link: result.link,
      expiresAt: result.expiresAt,
      maxUsageCount: result.maxUsageCount,
      usageCount: result.usageCount,
      eventTypeId: result.eventTypeId,
      eventType:
        result.teamId !== undefined || result.userId !== undefined
          ? {
              teamId: result.teamId ?? null,
              userId: result.userId ?? null,
            }
          : null,
    }));
  }

  async incrementUsage(linkId: number, maxUsageCount: number): Promise<HashedLinkDto> {
    const result = await this.dbWrite
      .updateTable("HashedLink")
      .set((eb) => ({
        usageCount: eb("usageCount", "+", 1),
      }))
      .where("id", "=", linkId)
      .where("usageCount", "<", maxUsageCount)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      link: result.link,
      eventTypeId: result.eventTypeId,
      expiresAt: result.expiresAt,
      maxUsageCount: result.maxUsageCount,
      usageCount: result.usageCount,
    };
  }
}
