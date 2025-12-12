import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";
import type { BookingStatus } from "@calcom/prisma/enums";

import type {
  BookingAttendeeDto,
  BookingForAuthorizationCheckDto,
  BookingMinimalDto,
  BookingWithEventTypeTeamIdDto,
  IBookingRepository,
} from "./IBookingRepository";

/**
 * Kysely implementation of BookingRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyBookingRepository implements IBookingRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async getBookingAttendees(bookingId: number): Promise<BookingAttendeeDto[]> {
    const results = await this.readDb
      .selectFrom("Attendee")
      .selectAll()
      .where("bookingId", "=", bookingId)
      .execute();

    return results.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      timeZone: r.timeZone,
      phoneNumber: r.phoneNumber,
      locale: r.locale,
      bookingId: r.bookingId,
      noShow: r.noShow,
    }));
  }

  async getBookingWithEventTypeTeamId(params: {
    bookingId: number;
  }): Promise<BookingWithEventTypeTeamIdDto | null> {
    const booking = await this.readDb
      .selectFrom("Booking")
      .leftJoin("EventType", "EventType.id", "Booking.eventTypeId")
      .select(["Booking.userId", "EventType.teamId"])
      .where("Booking.id", "=", params.bookingId)
      .executeTakeFirst();

    if (!booking) return null;

    return {
      userId: booking.userId,
      eventType: booking.teamId !== undefined ? { teamId: booking.teamId } : null,
    };
  }

  async findByUidIncludeEventType(params: {
    bookingUid: string;
  }): Promise<BookingForAuthorizationCheckDto | null> {
    const booking = await this.readDb
      .selectFrom("Booking")
      .leftJoin("User", "User.id", "Booking.userId")
      .leftJoin("EventType", "EventType.id", "Booking.eventTypeId")
      .leftJoin("EventType as ParentEventType", "ParentEventType.id", "EventType.parentId")
      .select([
        "Booking.id",
        "Booking.uid",
        "Booking.userId",
        "Booking.eventTypeId",
        "Booking.status",
        "User.id as user_id",
        "User.email as user_email",
        "EventType.teamId",
        "ParentEventType.teamId as parent_teamId",
      ])
      .where("Booking.uid", "=", params.bookingUid)
      .executeTakeFirst();

    if (!booking) return null;

    // Fetch attendees
    const attendees = await this.readDb
      .selectFrom("Attendee")
      .select(["email"])
      .where("bookingId", "=", booking.id)
      .execute();

    // Fetch hosts
    const hosts = booking.eventTypeId
      ? await this.readDb
          .selectFrom("Host")
          .innerJoin("User", "User.id", "Host.userId")
          .select(["Host.userId", "User.email"])
          .where("Host.eventTypeId", "=", booking.eventTypeId)
          .execute()
      : [];

    // Fetch event type users
    const eventTypeUsers = booking.eventTypeId
      ? await this.readDb
          .selectFrom("_EventTypeToUser")
          .innerJoin("User", "User.id", "_EventTypeToUser.B")
          .select(["User.id", "User.email"])
          .where("_EventTypeToUser.A", "=", booking.eventTypeId)
          .execute()
      : [];

    return {
      id: booking.id,
      uid: booking.uid,
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      status: booking.status as BookingStatus,
      user: booking.user_id
        ? {
            id: booking.user_id,
            email: booking.user_email!,
          }
        : null,
      attendees: attendees.map((a) => ({ email: a.email })),
      eventType: booking.eventTypeId
        ? {
            teamId: booking.teamId,
            parent: booking.parent_teamId !== undefined ? { teamId: booking.parent_teamId } : null,
            hosts: hosts.map((h) => ({
              userId: h.userId,
              user: { email: h.email },
            })),
            users: eventTypeUsers.map((u) => ({
              id: u.id,
              email: u.email,
            })),
          }
        : null,
    };
  }

  async findByIdIncludeEventType(params: {
    bookingId: number;
  }): Promise<BookingForAuthorizationCheckDto | null> {
    const booking = await this.readDb
      .selectFrom("Booking")
      .leftJoin("User", "User.id", "Booking.userId")
      .leftJoin("EventType", "EventType.id", "Booking.eventTypeId")
      .leftJoin("EventType as ParentEventType", "ParentEventType.id", "EventType.parentId")
      .select([
        "Booking.id",
        "Booking.uid",
        "Booking.userId",
        "Booking.eventTypeId",
        "Booking.status",
        "User.id as user_id",
        "User.email as user_email",
        "EventType.teamId",
        "ParentEventType.teamId as parent_teamId",
      ])
      .where("Booking.id", "=", params.bookingId)
      .executeTakeFirst();

    if (!booking) return null;

    // Fetch attendees
    const attendees = await this.readDb
      .selectFrom("Attendee")
      .select(["email"])
      .where("bookingId", "=", booking.id)
      .execute();

    // Fetch hosts
    const hosts = booking.eventTypeId
      ? await this.readDb
          .selectFrom("Host")
          .innerJoin("User", "User.id", "Host.userId")
          .select(["Host.userId", "User.email"])
          .where("Host.eventTypeId", "=", booking.eventTypeId)
          .execute()
      : [];

    // Fetch event type users
    const eventTypeUsers = booking.eventTypeId
      ? await this.readDb
          .selectFrom("_EventTypeToUser")
          .innerJoin("User", "User.id", "_EventTypeToUser.B")
          .select(["User.id", "User.email"])
          .where("_EventTypeToUser.A", "=", booking.eventTypeId)
          .execute()
      : [];

    return {
      id: booking.id,
      uid: booking.uid,
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      status: booking.status as BookingStatus,
      user: booking.user_id
        ? {
            id: booking.user_id,
            email: booking.user_email!,
          }
        : null,
      attendees: attendees.map((a) => ({ email: a.email })),
      eventType: booking.eventTypeId
        ? {
            teamId: booking.teamId,
            parent: booking.parent_teamId !== undefined ? { teamId: booking.parent_teamId } : null,
            hosts: hosts.map((h) => ({
              userId: h.userId,
              user: { email: h.email },
            })),
            users: eventTypeUsers.map((u) => ({
              id: u.id,
              email: u.email,
            })),
          }
        : null,
    };
  }

  async findByUidForAuthorizationCheck(params: { bookingUid: string }): Promise<unknown> {
    // This method returns complex nested data - delegate to findByUidIncludeEventType for now
    return this.findByUidIncludeEventType(params);
  }

  async findByUidForDetails(params: { bookingUid: string }): Promise<unknown> {
    // This method returns complex nested data with many relations
    // For now, return basic booking data
    const booking = await this.readDb
      .selectFrom("Booking")
      .selectAll()
      .where("uid", "=", params.bookingUid)
      .executeTakeFirst();

    return booking || null;
  }

  async findBookingByUid(params: { bookingUid: string }): Promise<BookingMinimalDto | null> {
    const booking = await this.readDb
      .selectFrom("Booking")
      .select(["id", "uid", "userId", "startTime", "endTime", "title", "status"])
      .where("uid", "=", params.bookingUid)
      .executeTakeFirst();

    if (!booking) return null;

    return {
      id: booking.id,
      uid: booking.uid,
      userId: booking.userId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      title: booking.title,
      status: booking.status as BookingStatus,
    };
  }

  async updateLocationById(params: {
    bookingId: number;
    location: string;
    referencesToCreate: {
      type: string;
      uid: string;
      meetingId?: string;
      meetingPassword?: string;
      meetingUrl?: string;
    }[];
    referencesToDelete: { type: string }[];
  }): Promise<{ references: { type: string; meetingUrl: string | null }[] }> {
    // Update booking location
    await this.writeDb
      .updateTable("Booking")
      .set({ location: params.location })
      .where("id", "=", params.bookingId)
      .execute();

    // Delete old references
    if (params.referencesToDelete.length > 0) {
      await this.writeDb
        .updateTable("BookingReference")
        .set({ deleted: new Date() })
        .where("bookingId", "=", params.bookingId)
        .where(
          "type",
          "in",
          params.referencesToDelete.map((r) => r.type)
        )
        .execute();
    }

    // Create new references
    for (const ref of params.referencesToCreate) {
      await this.writeDb
        .insertInto("BookingReference")
        .values({
          bookingId: params.bookingId,
          type: ref.type,
          uid: ref.uid,
          meetingId: ref.meetingId || null,
          meetingPassword: ref.meetingPassword || null,
          meetingUrl: ref.meetingUrl || null,
        })
        .execute();
    }

    // Fetch updated references
    const references = await this.readDb
      .selectFrom("BookingReference")
      .select(["type", "meetingUrl"])
      .where("bookingId", "=", params.bookingId)
      .where("deleted", "is", null)
      .execute();

    return {
      references: references.map((r) => ({
        type: r.type,
        meetingUrl: r.meetingUrl,
      })),
    };
  }

  async updateBookingStatus(params: {
    bookingId: number;
    status: BookingStatus;
  }): Promise<{ id: number; status: BookingStatus }> {
    await this.writeDb
      .updateTable("Booking")
      .set({ status: params.status })
      .where("id", "=", params.bookingId)
      .execute();

    return {
      id: params.bookingId,
      status: params.status,
    };
  }
}
