import { describe, expect, it } from "vitest";

import type { TrpcSessionUser } from "../../trpc";
import { populateOutOfOfficesForList, setupAndTeardown } from "./outOfOffice.test.utils";
import { outOfOfficeEntriesList } from "./outOfOfficeEntriesList.handler";
import { OutOfOfficeRecordType, type TOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";

describe("outOfOfficeEntriesList.handler", () => {
  setupAndTeardown();

  it("should list out of office records of team members for admin.", async () => {
    await populateOutOfOfficesForList();
    const loggedInUser = {
      id: 1,
      name: "User 1",
      username: "user-1",
      email: "user-1@test.com",
      timeZone: "Asia/Kolkata",
    };
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const input: TOutOfOfficeEntriesListSchema = {
      limit: 10,
      fetchTeamMembersEntries: true,
      recordType: OutOfOfficeRecordType.CURRENT,
    };

    const result = await outOfOfficeEntriesList({ ctx, input });
    const uniqueUserIds = new Set(result.rows.map((ooo) => ooo.user.id));
    const team1MemberUserIds = new Set([2, 3, 4]); //refer populateOutOfOfficesForList()
    expect(uniqueUserIds).toEqual(team1MemberUserIds);
  });
});
