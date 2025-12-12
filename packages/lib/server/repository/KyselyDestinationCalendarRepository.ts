import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  DestinationCalendarCreateInputDto,
  DestinationCalendarDto,
  DestinationCalendarUpdateInputDto,
  IDestinationCalendarRepository,
} from "./IDestinationCalendarRepository";

export class KyselyDestinationCalendarRepository implements IDestinationCalendarRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async create(data: DestinationCalendarCreateInputDto): Promise<DestinationCalendarDto> {
    const result = await this.writeDb
      .insertInto("DestinationCalendar")
      .values({
        integration: data.integration,
        externalId: data.externalId,
        primaryEmail: data.primaryEmail ?? null,
        userId: data.userId ?? null,
        eventTypeId: data.eventTypeId ?? null,
        credentialId: data.credentialId ?? null,
        delegationCredentialId: data.delegationCredentialId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async createIfNotExistsForUser(
    data: { userId: number } & DestinationCalendarCreateInputDto
  ): Promise<DestinationCalendarDto> {
    // Check for existing conflicting calendar
    const existing = await this.find({
      userId: data.userId,
      integration: data.integration,
      externalId: data.externalId,
      eventTypeId: null,
    });

    if (existing) {
      return existing;
    }

    return this.create(data);
  }

  async getByUserId(userId: number): Promise<DestinationCalendarDto | null> {
    const result = await this.readDb
      .selectFrom("DestinationCalendar")
      .selectAll()
      .where("userId", "=", userId)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async getByEventTypeId(eventTypeId: number): Promise<DestinationCalendarDto | null> {
    const result = await this.readDb
      .selectFrom("DestinationCalendar")
      .selectAll()
      .where("eventTypeId", "=", eventTypeId)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async find(where: {
    userId?: number | null;
    eventTypeId?: number | null;
    integration?: string;
    externalId?: string;
  }): Promise<DestinationCalendarDto | null> {
    let query = this.readDb.selectFrom("DestinationCalendar").selectAll();

    if (where.userId !== undefined) {
      query = query.where("userId", where.userId === null ? "is" : "=", where.userId);
    }
    if (where.eventTypeId !== undefined) {
      query = query.where("eventTypeId", where.eventTypeId === null ? "is" : "=", where.eventTypeId);
    }
    if (where.integration !== undefined) {
      query = query.where("integration", "=", where.integration);
    }
    if (where.externalId !== undefined) {
      query = query.where("externalId", "=", where.externalId);
    }

    const result = await query.executeTakeFirst();
    return result ? this.mapToDto(result) : null;
  }

  async upsert(params: {
    where: { id: number } | { eventTypeId: number } | { userId: number };
    update: DestinationCalendarUpdateInputDto;
    create: DestinationCalendarCreateInputDto;
  }): Promise<DestinationCalendarDto> {
    const { where, update, create } = params;

    // Try to find existing record
    let query = this.readDb.selectFrom("DestinationCalendar").selectAll();

    if ("id" in where) {
      query = query.where("id", "=", where.id);
    } else if ("eventTypeId" in where) {
      query = query.where("eventTypeId", "=", where.eventTypeId);
    } else if ("userId" in where) {
      query = query.where("userId", "=", where.userId);
    }

    const existing = await query.executeTakeFirst();

    if (existing) {
      // Update existing record
      const updateData: Record<string, unknown> = {};
      if (update.integration !== undefined) updateData.integration = update.integration;
      if (update.externalId !== undefined) updateData.externalId = update.externalId;
      if (update.primaryEmail !== undefined) updateData.primaryEmail = update.primaryEmail;
      if (update.credentialId !== undefined) updateData.credentialId = update.credentialId;
      if (update.delegationCredentialId !== undefined)
        updateData.delegationCredentialId = update.delegationCredentialId;

      const result = await this.writeDb
        .updateTable("DestinationCalendar")
        .set(updateData)
        .where("id", "=", existing.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.mapToDto(result);
    } else {
      // Create new record
      return this.create(create);
    }
  }

  private mapToDto(row: {
    id: number;
    integration: string;
    externalId: string;
    primaryEmail: string | null;
    userId: number | null;
    eventTypeId: number | null;
    credentialId: number | null;
    delegationCredentialId: string | null;
  }): DestinationCalendarDto {
    return {
      id: row.id,
      integration: row.integration,
      externalId: row.externalId,
      primaryEmail: row.primaryEmail,
      userId: row.userId,
      eventTypeId: row.eventTypeId,
      credentialId: row.credentialId,
      delegationCredentialId: row.delegationCredentialId,
    };
  }
}
