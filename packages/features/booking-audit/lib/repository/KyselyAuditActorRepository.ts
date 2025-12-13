import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IAuditActorRepository, AuditActorType } from "./IAuditActorRepository";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

type AuditActor = {
  id: string;
  type: AuditActorType;
  userUuid: string | null;
  attendeeId: number | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: Date;
};

export class KyselyAuditActorRepository implements IAuditActorRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findByUserUuid(userUuid: string): Promise<AuditActor | null> {
    const result = await this.dbRead
      .selectFrom("AuditActor")
      .selectAll()
      .where("userUuid", "=", userUuid)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      type: result.type as AuditActorType,
      userUuid: result.userUuid,
      attendeeId: result.attendeeId,
      email: result.email,
      phone: result.phone,
      name: result.name,
      createdAt: result.createdAt,
    };
  }

  async findSystemActorOrThrow(): Promise<AuditActor> {
    const result = await this.dbRead
      .selectFrom("AuditActor")
      .selectAll()
      .where("id", "=", SYSTEM_ACTOR_ID)
      .executeTakeFirst();

    if (!result) {
      throw new Error("System actor not found");
    }

    return {
      id: result.id,
      type: result.type as AuditActorType,
      userUuid: result.userUuid,
      attendeeId: result.attendeeId,
      email: result.email,
      phone: result.phone,
      name: result.name,
      createdAt: result.createdAt,
    };
  }

  async createIfNotExistsUserActor(params: { userUuid: string }): Promise<AuditActor> {
    // Try to find existing actor first
    const existing = await this.dbRead
      .selectFrom("AuditActor")
      .selectAll()
      .where("userUuid", "=", params.userUuid)
      .executeTakeFirst();

    if (existing) {
      return {
        id: existing.id,
        type: existing.type as AuditActorType,
        userUuid: existing.userUuid,
        attendeeId: existing.attendeeId,
        email: existing.email,
        phone: existing.phone,
        name: existing.name,
        createdAt: existing.createdAt,
      };
    }

    // Create new actor
    const result = await this.dbWrite
      .insertInto("AuditActor")
      .values({
        type: "USER",
        userUuid: params.userUuid,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      type: result.type as AuditActorType,
      userUuid: result.userUuid,
      attendeeId: result.attendeeId,
      email: result.email,
      phone: result.phone,
      name: result.name,
      createdAt: result.createdAt,
    };
  }

  async createIfNotExistsGuestActor(
    email: string | null,
    name: string | null,
    phone: string | null
  ): Promise<AuditActor> {
    const normalizedEmail = email && email.trim() !== "" ? email : null;
    const normalizedName = name && name.trim() !== "" ? name : null;
    const normalizedPhone = phone && phone.trim() !== "" ? phone : null;

    // If all fields are null, just create a new record
    if (!normalizedEmail && !normalizedPhone) {
      const result = await this.dbWrite
        .insertInto("AuditActor")
        .values({
          type: "GUEST",
          email: null,
          name: normalizedName,
          phone: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: result.id,
        type: result.type as AuditActorType,
        userUuid: result.userUuid,
        attendeeId: result.attendeeId,
        email: result.email,
        phone: result.phone,
        name: result.name,
        createdAt: result.createdAt,
      };
    }

    // First try to find by email if email exists
    if (normalizedEmail) {
      const existingByEmail = await this.dbRead
        .selectFrom("AuditActor")
        .selectAll()
        .where("email", "=", normalizedEmail)
        .executeTakeFirst();

      if (existingByEmail) {
        // Update existing record found by email
        const result = await this.dbWrite
          .updateTable("AuditActor")
          .set({
            name: normalizedName ?? undefined,
            phone: normalizedPhone ?? undefined,
          })
          .where("email", "=", normalizedEmail)
          .returningAll()
          .executeTakeFirstOrThrow();

        return {
          id: result.id,
          type: result.type as AuditActorType,
          userUuid: result.userUuid,
          attendeeId: result.attendeeId,
          email: result.email,
          phone: result.phone,
          name: result.name,
          createdAt: result.createdAt,
        };
      }
    }

    // If not found by email and phone exists, try to find by phone
    if (normalizedPhone) {
      const existingByPhone = await this.dbRead
        .selectFrom("AuditActor")
        .selectAll()
        .where("phone", "=", normalizedPhone)
        .executeTakeFirst();

      if (existingByPhone) {
        // Update existing record found by phone
        const result = await this.dbWrite
          .updateTable("AuditActor")
          .set({
            email: normalizedEmail ?? undefined,
            name: normalizedName ?? undefined,
          })
          .where("phone", "=", normalizedPhone)
          .returningAll()
          .executeTakeFirstOrThrow();

        return {
          id: result.id,
          type: result.type as AuditActorType,
          userUuid: result.userUuid,
          attendeeId: result.attendeeId,
          email: result.email,
          phone: result.phone,
          name: result.name,
          createdAt: result.createdAt,
        };
      }
    }

    // Not found by either email or phone, create new record
    const result = await this.dbWrite
      .insertInto("AuditActor")
      .values({
        type: "GUEST",
        email: normalizedEmail,
        name: normalizedName,
        phone: normalizedPhone,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      type: result.type as AuditActorType,
      userUuid: result.userUuid,
      attendeeId: result.attendeeId,
      email: result.email,
      phone: result.phone,
      name: result.name,
      createdAt: result.createdAt,
    };
  }

  async findByAttendeeId(attendeeId: number): Promise<AuditActor | null> {
    const result = await this.dbRead
      .selectFrom("AuditActor")
      .selectAll()
      .where("attendeeId", "=", attendeeId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      type: result.type as AuditActorType,
      userUuid: result.userUuid,
      attendeeId: result.attendeeId,
      email: result.email,
      phone: result.phone,
      name: result.name,
      createdAt: result.createdAt,
    };
  }
}
