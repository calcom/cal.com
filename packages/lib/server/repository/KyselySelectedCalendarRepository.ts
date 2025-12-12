import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";

import type {
  FindNextSubscriptionBatchInputDto,
  SelectedCalendarDto,
  UpdateSubscriptionInputDto,
  UpdateSyncStatusInputDto,
} from "./dto/SelectedCalendarDto";
import type { ISelectedCalendarRepository } from "./ISelectedCalendarRepository";

/**
 * Kysely implementation of SelectedCalendar repository
 * Uses read/write database instances for read replica support
 */
export class KyselySelectedCalendarRepository implements ISelectedCalendarRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findById(id: string): Promise<SelectedCalendarDto | null> {
    const result = await this.readDb
      .selectFrom("SelectedCalendar")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findByChannelId(channelId: string): Promise<SelectedCalendarDto | null> {
    const result = await this.readDb
      .selectFrom("SelectedCalendar")
      .selectAll()
      .where("channelId", "=", channelId)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findNextSubscriptionBatch(
    input: FindNextSubscriptionBatchInputDto
  ): Promise<SelectedCalendarDto[]> {
    const { take, teamIds, integrations } = input;

    // Build the query with subquery for team membership check
    const results = await this.readDb
      .selectFrom("SelectedCalendar")
      .selectAll("SelectedCalendar")
      .where("integration", "in", integrations)
      .where((eb) =>
        eb.or([
          eb("syncSubscribedAt", "is", null),
          eb("channelExpiration", "<=", new Date()),
        ])
      )
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom("Membership")
            .select("Membership.id")
            .where("Membership.userId", "=", eb.ref("SelectedCalendar.userId"))
            .where("Membership.teamId", "in", teamIds)
            .where("Membership.accepted", "=", true)
        )
      )
      .limit(take)
      .execute();

    return results.map((r) => this.mapToDto(r));
  }

  async updateSyncStatus(id: string, data: UpdateSyncStatusInputDto): Promise<SelectedCalendarDto> {
    const updateData: Record<string, unknown> = {};

    if (data.syncToken !== undefined) {
      updateData.syncToken = data.syncToken;
    }
    if (data.syncedAt !== undefined) {
      updateData.syncedAt = data.syncedAt;
    }
    if (data.syncErrorAt !== undefined) {
      updateData.syncErrorAt = data.syncErrorAt;
    }
    if (data.syncErrorCount !== undefined) {
      updateData.syncErrorCount = data.syncErrorCount;
    }

    const result = await this.writeDb
      .updateTable("SelectedCalendar")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInputDto): Promise<SelectedCalendarDto> {
    const updateData: Record<string, unknown> = {};

    if (data.channelId !== undefined) {
      updateData.channelId = data.channelId;
    }
    if (data.channelResourceId !== undefined) {
      updateData.channelResourceId = data.channelResourceId;
    }
    if (data.channelResourceUri !== undefined) {
      updateData.channelResourceUri = data.channelResourceUri;
    }
    if (data.channelKind !== undefined) {
      updateData.channelKind = data.channelKind;
    }
    if (data.channelExpiration !== undefined) {
      updateData.channelExpiration = data.channelExpiration;
    }
    if (data.syncSubscribedAt !== undefined) {
      updateData.syncSubscribedAt = data.syncSubscribedAt;
    }

    const result = await this.writeDb
      .updateTable("SelectedCalendar")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  private mapToDto(row: {
    id: string;
    userId: number;
    integration: string;
    externalId: string;
    credentialId: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    googleChannelId: string | null;
    googleChannelKind: string | null;
    googleChannelResourceId: string | null;
    googleChannelResourceUri: string | null;
    googleChannelExpiration: string | null;
    channelId: string | null;
    channelKind: string | null;
    channelResourceId: string | null;
    channelResourceUri: string | null;
    channelExpiration: Date | null;
    syncSubscribedAt: Date | null;
    syncToken: string | null;
    syncedAt: Date | null;
    syncErrorAt: Date | null;
    syncErrorCount: number | null;
    delegationCredentialId: string | null;
    domainWideDelegationCredentialId: string | null;
    error: string | null;
    lastErrorAt: Date | null;
  }): SelectedCalendarDto {
    return {
      id: row.id,
      userId: row.userId,
      integration: row.integration,
      externalId: row.externalId,
      credentialId: row.credentialId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      googleChannelId: row.googleChannelId,
      googleChannelKind: row.googleChannelKind,
      googleChannelResourceId: row.googleChannelResourceId,
      googleChannelResourceUri: row.googleChannelResourceUri,
      googleChannelExpiration: row.googleChannelExpiration,
      channelId: row.channelId,
      channelKind: row.channelKind,
      channelResourceId: row.channelResourceId,
      channelResourceUri: row.channelResourceUri,
      channelExpiration: row.channelExpiration,
      syncSubscribedAt: row.syncSubscribedAt,
      syncToken: row.syncToken,
      syncedAt: row.syncedAt,
      syncErrorAt: row.syncErrorAt,
      syncErrorCount: row.syncErrorCount,
      delegationCredentialId: row.delegationCredentialId,
      domainWideDelegationCredentialId: row.domainWideDelegationCredentialId,
      error: row.error,
      lastErrorAt: row.lastErrorAt,
    };
  }
}
