import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IVideoCallGuestRepository, VideoCallGuestDto } from "./IVideoCallGuestRepository";

export class KyselyVideoCallGuestRepository implements IVideoCallGuestRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async upsertVideoCallGuest(params: {
    bookingUid: string;
    email: string;
    name: string;
  }): Promise<VideoCallGuestDto> {
    const existing = await this.dbRead
      .selectFrom("VideoCallGuest")
      .selectAll()
      .where("bookingUid", "=", params.bookingUid)
      .where("email", "=", params.email)
      .executeTakeFirst();

    if (existing) {
      const updated = await this.dbWrite
        .updateTable("VideoCallGuest")
        .set({ name: params.name })
        .where("bookingUid", "=", params.bookingUid)
        .where("email", "=", params.email)
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: updated.id,
        bookingUid: updated.bookingUid,
        email: updated.email,
        name: updated.name,
        createdAt: updated.createdAt,
      };
    }

    const created = await this.dbWrite
      .insertInto("VideoCallGuest")
      .values({
        bookingUid: params.bookingUid,
        email: params.email,
        name: params.name,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: created.id,
      bookingUid: created.bookingUid,
      email: created.email,
      name: created.name,
      createdAt: created.createdAt,
    };
  }
}
