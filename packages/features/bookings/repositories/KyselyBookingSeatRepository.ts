import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  IBookingSeatRepository,
  BookingSeatAttendeeDto,
  BookingSeatAttendeeDetailsDto,
} from "./IBookingSeatRepository";

export class KyselyBookingSeatRepository implements IBookingSeatRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async getByUidIncludeAttendee(uid: string): Promise<{ attendee: BookingSeatAttendeeDto | null } | null> {
    const result = await this.dbRead
      .selectFrom("BookingSeat")
      .leftJoin("Attendee", "Attendee.id", "BookingSeat.attendeeId")
      .select(["Attendee.email as attendee_email"])
      .where("BookingSeat.referenceUid", "=", uid)
      .executeTakeFirst();

    if (!result) return null;

    return {
      attendee: result.attendee_email
        ? {
            email: result.attendee_email,
          }
        : null,
    };
  }

  async getByReferenceUidWithAttendeeDetails(
    referenceUid: string
  ): Promise<{ attendee: BookingSeatAttendeeDetailsDto | null } | null> {
    const result = await this.dbRead
      .selectFrom("BookingSeat")
      .leftJoin("Attendee", "Attendee.id", "BookingSeat.attendeeId")
      .select([
        "Attendee.name as attendee_name",
        "Attendee.id as attendee_id",
        "Attendee.bookingId as attendee_bookingId",
        "Attendee.noShow as attendee_noShow",
        "Attendee.phoneNumber as attendee_phoneNumber",
        "Attendee.email as attendee_email",
        "Attendee.locale as attendee_locale",
        "Attendee.timeZone as attendee_timeZone",
      ])
      .where("BookingSeat.referenceUid", "=", referenceUid)
      .executeTakeFirst();

    if (!result) return null;

    return {
      attendee:
        result.attendee_id && result.attendee_email && result.attendee_timeZone
          ? {
              name: result.attendee_name,
              id: result.attendee_id,
              bookingId: result.attendee_bookingId,
              noShow: result.attendee_noShow,
              phoneNumber: result.attendee_phoneNumber,
              email: result.attendee_email,
              locale: result.attendee_locale,
              timeZone: result.attendee_timeZone,
            }
          : null,
    };
  }
}
