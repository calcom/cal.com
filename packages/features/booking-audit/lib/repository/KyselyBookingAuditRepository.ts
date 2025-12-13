import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  IBookingAuditRepository,
  BookingAuditCreateInput,
  BookingAuditWithActor,
  BookingAuditAction,
  BookingAuditType,
} from "./IBookingAuditRepository";
import type { AuditActorType } from "./IAuditActorRepository";

export class KyselyBookingAuditRepository implements IBookingAuditRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async create(bookingAudit: BookingAuditCreateInput) {
    const result = await this.dbWrite
      .insertInto("BookingAudit")
      .values({
        bookingUid: bookingAudit.bookingUid,
        actorId: bookingAudit.actorId,
        action: bookingAudit.action,
        type: bookingAudit.type,
        timestamp: bookingAudit.timestamp,
        data: bookingAudit.data === null ? undefined : bookingAudit.data,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      bookingUid: result.bookingUid,
      actorId: result.actorId,
      action: result.action as BookingAuditAction,
      type: result.type as BookingAuditType,
      timestamp: result.timestamp,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      data: result.data,
    };
  }

  async findAllForBooking(bookingUid: string): Promise<BookingAuditWithActor[]> {
    const results = await this.dbRead
      .selectFrom("BookingAudit")
      .innerJoin("AuditActor", "AuditActor.id", "BookingAudit.actorId")
      .select([
        "BookingAudit.id",
        "BookingAudit.bookingUid",
        "BookingAudit.actorId",
        "BookingAudit.action",
        "BookingAudit.type",
        "BookingAudit.timestamp",
        "BookingAudit.createdAt",
        "BookingAudit.updatedAt",
        "BookingAudit.data",
        "AuditActor.id as actor_id",
        "AuditActor.type as actor_type",
        "AuditActor.userUuid as actor_userUuid",
        "AuditActor.attendeeId as actor_attendeeId",
        "AuditActor.name as actor_name",
        "AuditActor.createdAt as actor_createdAt",
      ])
      .where("BookingAudit.bookingUid", "=", bookingUid)
      .orderBy("BookingAudit.timestamp", "desc")
      .execute();

    return results.map((row) => ({
      id: row.id,
      bookingUid: row.bookingUid,
      actorId: row.actorId,
      action: row.action as BookingAuditAction,
      type: row.type as BookingAuditType,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      data: row.data,
      actor: {
        id: row.actor_id,
        type: row.actor_type as AuditActorType,
        userUuid: row.actor_userUuid,
        attendeeId: row.actor_attendeeId,
        name: row.actor_name,
        createdAt: row.actor_createdAt,
      },
    }));
  }
}
