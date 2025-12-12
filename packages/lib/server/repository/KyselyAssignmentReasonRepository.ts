import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { AssignmentReasonDto, IAssignmentReasonRepository } from "./IAssignmentReasonRepository";

export class KyselyAssignmentReasonRepository implements IAssignmentReasonRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findLatestReasonFromBookingUid(bookingUid: string): Promise<AssignmentReasonDto | null> {
    const result = await this.dbRead
      .selectFrom("AssignmentReason")
      .innerJoin("Booking", "Booking.id", "AssignmentReason.bookingId")
      .select([
        "AssignmentReason.id",
        "AssignmentReason.reasonString",
        "AssignmentReason.reasonEnum",
        "AssignmentReason.bookingId",
        "AssignmentReason.createdAt",
      ])
      .where("Booking.uid", "=", bookingUid)
      .orderBy("AssignmentReason.createdAt", "desc")
      .limit(1)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      reasonString: result.reasonString,
      reasonEnum: result.reasonEnum,
      bookingId: result.bookingId,
      createdAt: result.createdAt,
    };
  }
}
