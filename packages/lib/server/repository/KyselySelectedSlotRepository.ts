import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";

import type { SelectedSlot } from "./dto/SelectedSlot";
import type { ISelectedSlotRepository, TimeSlot } from "./ISelectedSlotRepository";

export class KyselySelectedSlotRepository implements ISelectedSlotRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findReservedByOthers({
    slot,
    eventTypeId,
    uid,
  }: {
    slot: TimeSlot;
    eventTypeId: number;
    uid: string;
  }): Promise<SelectedSlot | null> {
    const result = await this.readDb
      .selectFrom("SelectedSlots")
      .select(["id", "uid", "eventTypeId", "slotUtcStartDate", "slotUtcEndDate", "releaseAt", "isSeat"])
      .where("slotUtcStartDate", "=", new Date(slot.utcStartIso))
      .where("slotUtcEndDate", "=", new Date(slot.utcEndIso))
      .where("eventTypeId", "=", eventTypeId)
      .where("uid", "!=", uid)
      .where("releaseAt", ">", new Date())
      .executeTakeFirst();

    return result ?? null;
  }

  async findManyReservedByOthers(
    slots: TimeSlot[],
    eventTypeId: number,
    uid: string
  ): Promise<Array<Pick<SelectedSlot, "slotUtcEndDate" | "slotUtcStartDate">>> {
    if (slots.length === 0) {
      return [];
    }

    // Build OR conditions for each slot
    let query = this.readDb
      .selectFrom("SelectedSlots")
      .select(["slotUtcStartDate", "slotUtcEndDate"])
      .where("eventTypeId", "=", eventTypeId)
      .where("uid", "!=", uid)
      .where("releaseAt", ">", new Date());

    // Add OR conditions for each slot's start/end time combination
    query = query.where((eb) =>
      eb.or(
        slots.map((slot) =>
          eb.and([
            eb("slotUtcStartDate", "=", new Date(slot.utcStartIso)),
            eb("slotUtcEndDate", "=", new Date(slot.utcEndIso)),
          ])
        )
      )
    );

    return await query.execute();
  }

  async findManyUnexpiredSlots({
    userIds,
    currentTimeInUtc,
  }: {
    userIds: number[];
    currentTimeInUtc: string;
  }): Promise<Array<Omit<SelectedSlot, "releaseAt">>> {
    if (userIds.length === 0) {
      return [];
    }

    const results = await this.readDb
      .selectFrom("SelectedSlots")
      .select(["id", "slotUtcStartDate", "slotUtcEndDate", "userId", "isSeat", "eventTypeId", "uid"])
      .where("userId", "in", userIds)
      .where("releaseAt", ">", new Date(currentTimeInUtc))
      .execute();

    return results;
  }

  async deleteManyExpiredSlots({
    eventTypeId,
    currentTimeInUtc,
  }: {
    eventTypeId: number;
    currentTimeInUtc: string;
  }): Promise<{ count: number }> {
    const result = await this.writeDb
      .deleteFrom("SelectedSlots")
      .where("eventTypeId", "=", eventTypeId)
      .where("releaseAt", "<", new Date(currentTimeInUtc))
      .executeTakeFirst();

    return { count: Number(result.numDeletedRows) };
  }
}
