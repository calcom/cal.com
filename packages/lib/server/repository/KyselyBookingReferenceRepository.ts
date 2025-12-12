import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  BookingReferenceDto,
  IBookingReferenceRepository,
  PartialReferenceDto,
} from "./IBookingReferenceRepository";

export class KyselyBookingReferenceRepository implements IBookingReferenceRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findDailyVideoReferenceByRoomName(roomName: string): Promise<BookingReferenceDto | null> {
    const result = await this.readDb
      .selectFrom("BookingReference")
      .select(["id", "type", "uid", "meetingId", "meetingUrl", "credentialId", "deleted", "bookingId"])
      .where("type", "=", "daily_video")
      .where("uid", "=", roomName)
      .where("meetingId", "=", roomName)
      .where("bookingId", "is not", null)
      .where("deleted", "is", null)
      .executeTakeFirst();

    return result ?? null;
  }

  async replaceBookingReferences(params: {
    bookingId: number;
    newReferencesToCreate: PartialReferenceDto[];
  }): Promise<void> {
    const { bookingId, newReferencesToCreate } = params;
    const newReferenceTypes = newReferencesToCreate.map((reference) => reference.type);

    // Mark existing references as deleted
    await this.writeDb
      .updateTable("BookingReference")
      .set({ deleted: true })
      .where("bookingId", "=", bookingId)
      .where("type", "in", newReferenceTypes)
      .execute();

    // Create new references
    if (newReferencesToCreate.length > 0) {
      await this.writeDb
        .insertInto("BookingReference")
        .values(
          newReferencesToCreate.map((reference) => ({
            type: reference.type,
            uid: reference.uid ?? "",
            meetingId: reference.meetingId ?? null,
            meetingUrl: reference.meetingUrl ?? null,
            meetingPassword: reference.meetingPassword ?? null,
            credentialId: reference.credentialId ?? null,
            externalCalendarId: reference.externalCalendarId ?? null,
            bookingId,
          }))
        )
        .execute();
    }
  }
}
