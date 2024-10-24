import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { addTeamsToDb, addUsers, TestData } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../trpc";
import { getFutureDateUTC, setupAndTeardown, TimeOfDay } from "./outOfOffice.test.utils";
import { outOfOfficeEntryDelete } from "./outOfOfficeEntryDelete.handler";
import { type TOutOfOfficeDelete } from "./outOfOfficeEntryDelete.schema";

describe("outOfOfficeEntryDelete.handler", () => {
  setupAndTeardown();

  it("should successfully delete out of office for admin.", async () => {
    const teams = [
      {
        id: 1,
        name: "Team 1",
        slug: "team-1",
      },
    ];
    await addTeamsToDb(teams);

    const users = [
      {
        id: 1,
        name: "User 1",
        username: "user-1",
        email: "user-1@test.com",
        timeZone: "Asia/Kolkata",
        schedules: [TestData.schedules.IstWorkHours],
      },
      {
        id: 2,
        name: "User 2",
        username: "user-2",
        email: "user-2@test.com",
        timeZone: "Asia/Kolkata",
        schedules: [TestData.schedules.IstWorkHours],
      },
    ];
    addUsers(users);

    await prismock.membership.createMany({
      data: [
        {
          id: 1,
          teamId: teams[0].id,
          userId: users[0].id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
        {
          id: 2,
          teamId: teams[0].id,
          userId: users[1].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    const uuid = uuidv4();
    await prismock.outOfOfficeEntry.create({
      data: {
        userId: users[1].id,
        uuid,
        start: new Date(getFutureDateUTC(5, TimeOfDay.START)),
        end: new Date(getFutureDateUTC(7, TimeOfDay.END)),
        notes: "",
        reasonId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const { schedules, ...loggedInUser } = users[0];
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const input: TOutOfOfficeDelete = {
      outOfOfficeUid: uuid,
      userId: users[1].id,
    };

    const result = await outOfOfficeEntryDelete({ ctx, input });
    expect(result).toStrictEqual({});

    //expect outOfOffice to be deleted in db
    const ooo = await prismock.outOfOfficeEntry.findMany({
      where: {
        uuid,
      },
    });
    expect(ooo.length).toEqual(0);
  });

  it("should throw error while non-admin trying to delete other's out of office.", async () => {
    const teams = [
      {
        id: 1,
        name: "Team 1",
        slug: "team-1",
      },
    ];
    await addTeamsToDb(teams);

    const users = [
      {
        id: 1,
        name: "User 1",
        username: "user-1",
        email: "user-1@test.com",
        timeZone: "Asia/Kolkata",
        schedules: [TestData.schedules.IstWorkHours],
      },
      {
        id: 2,
        name: "User 2",
        username: "user-2",
        email: "user-2@test.com",
        timeZone: "Asia/Kolkata",
        schedules: [TestData.schedules.IstWorkHours],
      },
    ];
    addUsers(users);

    await prismock.membership.createMany({
      data: [
        {
          id: 1,
          teamId: teams[0].id,
          userId: users[0].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
        {
          id: 2,
          teamId: teams[0].id,
          userId: users[1].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    const uuid = uuidv4();
    await prismock.outOfOfficeEntry.create({
      data: {
        userId: users[1].id,
        uuid,
        start: new Date(getFutureDateUTC(5, TimeOfDay.START)),
        end: new Date(getFutureDateUTC(7, TimeOfDay.END)),
        notes: "",
        reasonId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const { schedules, ...loggedInUser } = users[0];
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const input: TOutOfOfficeDelete = {
      outOfOfficeUid: uuid,
      userId: users[1].id,
    };

    try {
      await outOfOfficeEntryDelete({ ctx, input });
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as { code: string }).code).toEqual("NOT_FOUND");
      expect((e as { message: string }).message).toBe("only_admin_can_delete_ooo");
    }

    //expect outOfOffice NOT to be deleted in db
    const ooo = await prismock.outOfOfficeEntry.findMany({
      where: {
        uuid,
      },
    });
    expect(ooo.length).toEqual(1);
  });
});
