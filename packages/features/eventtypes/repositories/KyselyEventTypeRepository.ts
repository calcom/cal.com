import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";
import type { PeriodType, SchedulingType } from "@calcom/prisma/enums";

import type {
  EventTypeCreateInputDto,
  EventTypeDto,
  IEventTypeRepository,
} from "./IEventTypeRepository";

/**
 * Kysely implementation of EventTypeRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyEventTypeRepository implements IEventTypeRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  private mapToDto(row: Record<string, unknown>): EventTypeDto {
    return {
      id: row.id as number,
      title: row.title as string,
      slug: row.slug as string,
      description: row.description as string | null,
      length: row.length as number,
      hidden: row.hidden as boolean,
      userId: row.userId as number | null,
      teamId: row.teamId as number | null,
      profileId: row.profileId as number | null,
      parentId: row.parentId as number | null,
      scheduleId: row.scheduleId as number | null,
      schedulingType: row.schedulingType as SchedulingType | null,
      periodType: row.periodType as PeriodType,
      periodDays: row.periodDays as number | null,
      periodStartDate: row.periodStartDate as Date | null,
      periodEndDate: row.periodEndDate as Date | null,
      periodCountCalendarDays: row.periodCountCalendarDays as boolean | null,
      requiresConfirmation: row.requiresConfirmation as boolean,
      disableGuests: row.disableGuests as boolean,
      minimumBookingNotice: row.minimumBookingNotice as number,
      beforeEventBuffer: row.beforeEventBuffer as number,
      afterEventBuffer: row.afterEventBuffer as number,
      slotInterval: row.slotInterval as number | null,
      metadata: row.metadata,
      seatsPerTimeSlot: row.seatsPerTimeSlot as number | null,
      price: row.price as number,
      currency: row.currency as string,
      position: row.position as number,
      successRedirectUrl: row.successRedirectUrl as string | null,
      forwardParamsSuccessRedirect: row.forwardParamsSuccessRedirect as boolean | null,
      timeZone: row.timeZone as string | null,
      eventName: row.eventName as string | null,
      recurringEvent: row.recurringEvent,
      bookingLimits: row.bookingLimits,
      durationLimits: row.durationLimits,
      locations: row.locations,
      customInputs: row.customInputs,
      bookingFields: row.bookingFields,
    };
  }

  async create(data: EventTypeCreateInputDto): Promise<EventTypeDto> {
    const result = await this.writeDb
      .insertInto("EventType")
      .values({
        title: data.title,
        slug: data.slug,
        length: data.length,
        description: data.description ?? null,
        hidden: data.hidden ?? false,
        userId: data.userId ?? null,
        teamId: data.teamId ?? null,
        profileId: data.profileId ?? null,
        parentId: data.parentId ?? null,
        scheduleId: data.scheduleId ?? null,
        schedulingType: data.schedulingType ?? null,
        periodType: data.periodType ?? "UNLIMITED",
        periodDays: data.periodDays ?? null,
        periodStartDate: data.periodStartDate ?? null,
        periodEndDate: data.periodEndDate ?? null,
        periodCountCalendarDays: data.periodCountCalendarDays ?? null,
        requiresConfirmation: data.requiresConfirmation ?? false,
        disableGuests: data.disableGuests ?? false,
        minimumBookingNotice: data.minimumBookingNotice ?? 120,
        beforeEventBuffer: data.beforeEventBuffer ?? 0,
        afterEventBuffer: data.afterEventBuffer ?? 0,
        slotInterval: data.slotInterval ?? null,
        metadata: data.metadata ?? null,
        seatsPerTimeSlot: data.seatsPerTimeSlot ?? null,
        price: data.price ?? 0,
        currency: data.currency ?? "usd",
        position: data.position ?? 0,
        successRedirectUrl: data.successRedirectUrl ?? null,
        forwardParamsSuccessRedirect: data.forwardParamsSuccessRedirect ?? null,
        timeZone: data.timeZone ?? null,
        eventName: data.eventName ?? null,
        recurringEvent: data.recurringEvent ?? null,
        bookingLimits: data.bookingLimits ?? null,
        durationLimits: data.durationLimits ?? null,
        locations: data.locations ?? null,
        customInputs: data.customInputs ?? null,
        bookingFields: data.bookingFields ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async findById(id: number): Promise<EventTypeDto | null> {
    const result = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findByIdMinimal(id: number): Promise<{ id: number; slug: string; title: string } | null> {
    const result = await this.readDb
      .selectFrom("EventType")
      .select(["id", "slug", "title"])
      .where("id", "=", id)
      .executeTakeFirst();

    return result ?? null;
  }

  async findTitleById(id: number): Promise<{ title: string } | null> {
    const result = await this.readDb
      .selectFrom("EventType")
      .select(["title"])
      .where("id", "=", id)
      .executeTakeFirst();

    return result ?? null;
  }

  async findAllByUserId(userId: number): Promise<EventTypeDto[]> {
    const results = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where("userId", "=", userId)
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async findFirstEventTypeId(userId: number): Promise<number | null> {
    const result = await this.readDb
      .selectFrom("EventType")
      .select(["id"])
      .where("userId", "=", userId)
      .orderBy("id", "asc")
      .limit(1)
      .executeTakeFirst();

    return result?.id ?? null;
  }

  async getTeamIdByEventTypeId(eventTypeId: number): Promise<number | null> {
    const result = await this.readDb
      .selectFrom("EventType")
      .select(["teamId"])
      .where("id", "=", eventTypeId)
      .executeTakeFirst();

    return result?.teamId ?? null;
  }

  async findByIdWithParent(
    id: number
  ): Promise<(EventTypeDto & { parent: { id: number; teamId: number | null } | null }) | null> {
    const result = await this.readDb
      .selectFrom("EventType as et")
      .leftJoin("EventType as parent", "et.parentId", "parent.id")
      .select([
        "et.id",
        "et.title",
        "et.slug",
        "et.description",
        "et.length",
        "et.hidden",
        "et.userId",
        "et.teamId",
        "et.profileId",
        "et.parentId",
        "et.scheduleId",
        "et.schedulingType",
        "et.periodType",
        "et.periodDays",
        "et.periodStartDate",
        "et.periodEndDate",
        "et.periodCountCalendarDays",
        "et.requiresConfirmation",
        "et.disableGuests",
        "et.minimumBookingNotice",
        "et.beforeEventBuffer",
        "et.afterEventBuffer",
        "et.slotInterval",
        "et.metadata",
        "et.seatsPerTimeSlot",
        "et.price",
        "et.currency",
        "et.position",
        "et.successRedirectUrl",
        "et.forwardParamsSuccessRedirect",
        "et.timeZone",
        "et.eventName",
        "et.recurringEvent",
        "et.bookingLimits",
        "et.durationLimits",
        "et.locations",
        "et.customInputs",
        "et.bookingFields",
        "parent.id as parentEventTypeId",
        "parent.teamId as parentTeamId",
      ])
      .where("et.id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    const eventType = this.mapToDto(result);
    const parent = result.parentEventTypeId
      ? { id: result.parentEventTypeId, teamId: result.parentTeamId }
      : null;

    return { ...eventType, parent };
  }

  async findAllByTeamId(teamId: number): Promise<EventTypeDto[]> {
    const results = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where("teamId", "=", teamId)
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async findEventTypesWithoutChildren(userId: number): Promise<EventTypeDto[]> {
    const results = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where("userId", "=", userId)
      .where("parentId", "is", null)
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async findAllIncludingChildrenByUserId(userId: number): Promise<EventTypeDto[]> {
    const results = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where((eb) =>
        eb.or([eb("userId", "=", userId), eb("parentId", "is not", null).and("userId", "=", userId)])
      )
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async findAllIncludingChildrenByTeamId(teamId: number): Promise<EventTypeDto[]> {
    const results = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where((eb) =>
        eb.or([eb("teamId", "=", teamId), eb("parentId", "is not", null).and("teamId", "=", teamId)])
      )
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async findManyChildEventTypes(parentId: number): Promise<EventTypeDto[]> {
    const results = await this.readDb
      .selectFrom("EventType")
      .selectAll()
      .where("parentId", "=", parentId)
      .execute();

    return results.map((row) => this.mapToDto(row));
  }
}
