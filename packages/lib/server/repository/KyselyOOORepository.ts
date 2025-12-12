import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IOOORepository, OOOEntryDto, OOOEntryIntervalDto } from "./IOOORepository";

export class KyselyOOORepository implements IOOORepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findManyOOO(params: {
    startTimeDate: Date;
    endTimeDate: Date;
    allUserIds: number[];
  }): Promise<OOOEntryDto[]> {
    const { startTimeDate, endTimeDate, allUserIds } = params;

    const results = await this.readDb
      .selectFrom("OutOfOfficeEntry")
      .leftJoin("users as user", "user.id", "OutOfOfficeEntry.userId")
      .leftJoin("users as toUser", "toUser.id", "OutOfOfficeEntry.toUserId")
      .leftJoin("OutOfOfficeReason as reason", "reason.id", "OutOfOfficeEntry.reasonId")
      .select([
        "OutOfOfficeEntry.id",
        "OutOfOfficeEntry.start",
        "OutOfOfficeEntry.end",
        "OutOfOfficeEntry.notes",
        "OutOfOfficeEntry.showNotePublicly",
        "user.id as userId",
        "user.name as userName",
        "toUser.id as toUserId",
        "toUser.username as toUserUsername",
        "toUser.name as toUserName",
        "reason.id as reasonId",
        "reason.emoji as reasonEmoji",
        "reason.reason as reasonText",
      ])
      .where("OutOfOfficeEntry.userId", "in", allUserIds)
      .where((eb) =>
        eb.or([
          eb.and([eb("OutOfOfficeEntry.start", "<=", endTimeDate), eb("OutOfOfficeEntry.end", ">=", startTimeDate)]),
          eb.and([eb("OutOfOfficeEntry.start", "<=", endTimeDate), eb("OutOfOfficeEntry.end", ">=", endTimeDate)]),
          eb.and([eb("OutOfOfficeEntry.start", "<=", startTimeDate), eb("OutOfOfficeEntry.end", "<=", endTimeDate)]),
        ])
      )
      .execute();

    return results.map((r) => ({
      id: r.id,
      start: r.start,
      end: r.end,
      notes: r.notes,
      showNotePublicly: r.showNotePublicly,
      user: {
        id: r.userId!,
        name: r.userName,
      },
      toUser: r.toUserId
        ? {
            id: r.toUserId,
            username: r.toUserUsername,
            name: r.toUserName,
          }
        : null,
      reason: r.reasonId
        ? {
            id: r.reasonId,
            emoji: r.reasonEmoji!,
            reason: r.reasonText!,
          }
        : null,
    }));
  }

  async findUserOOODays(params: { userId: number; dateTo: string; dateFrom: string }): Promise<OOOEntryDto[]> {
    const { userId, dateTo, dateFrom } = params;
    const dateToDate = new Date(dateTo);
    const dateFromDate = new Date(dateFrom);

    const results = await this.readDb
      .selectFrom("OutOfOfficeEntry")
      .leftJoin("users as user", "user.id", "OutOfOfficeEntry.userId")
      .leftJoin("users as toUser", "toUser.id", "OutOfOfficeEntry.toUserId")
      .leftJoin("OutOfOfficeReason as reason", "reason.id", "OutOfOfficeEntry.reasonId")
      .select([
        "OutOfOfficeEntry.id",
        "OutOfOfficeEntry.start",
        "OutOfOfficeEntry.end",
        "OutOfOfficeEntry.notes",
        "OutOfOfficeEntry.showNotePublicly",
        "user.id as userId",
        "user.name as userName",
        "toUser.id as toUserId",
        "toUser.username as toUserUsername",
        "toUser.name as toUserName",
        "reason.id as reasonId",
        "reason.emoji as reasonEmoji",
        "reason.reason as reasonText",
      ])
      .where("OutOfOfficeEntry.userId", "=", userId)
      .where((eb) =>
        eb.or([
          eb.and([eb("OutOfOfficeEntry.start", "<=", dateToDate), eb("OutOfOfficeEntry.end", ">=", dateFromDate)]),
          eb.and([eb("OutOfOfficeEntry.start", "<=", dateToDate), eb("OutOfOfficeEntry.end", ">=", dateToDate)]),
          eb.and([eb("OutOfOfficeEntry.start", "<=", dateFromDate), eb("OutOfOfficeEntry.end", "<=", dateToDate)]),
        ])
      )
      .execute();

    return results.map((r) => ({
      id: r.id,
      start: r.start,
      end: r.end,
      notes: r.notes,
      showNotePublicly: r.showNotePublicly,
      user: {
        id: r.userId!,
        name: r.userName,
      },
      toUser: r.toUserId
        ? {
            id: r.toUserId,
            username: r.toUserUsername,
            name: r.toUserName,
          }
        : null,
      reason: r.reasonId
        ? {
            id: r.reasonId,
            emoji: r.reasonEmoji!,
            reason: r.reasonText!,
          }
        : null,
    }));
  }

  async findOOOEntriesInInterval(params: {
    userIds: number[];
    startDate: Date;
    endDate: Date;
  }): Promise<OOOEntryIntervalDto[]> {
    const { userIds, startDate, endDate } = params;

    const results = await this.readDb
      .selectFrom("OutOfOfficeEntry")
      .select(["start", "end", "userId"])
      .where("userId", "in", userIds)
      .where("start", "<=", endDate)
      .where("end", ">=", startDate)
      .execute();

    return results;
  }
}
