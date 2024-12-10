import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { addTeamsToDb, addUsers, TestData } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../trpc";
import { getFutureDateUTC, setupAndTeardown, TimeOfDay } from "./outOfOffice.test.utils";
import { outOfOfficeCreateOrUpdate } from "./outOfOfficeCreateOrUpdate.handler";
import { type TOutOfOfficeInputSchema } from "./outOfOfficeCreateOrUpdate.schema";

describe("outOfOfficeCreateOrUpdate.handler", () => {
  setupAndTeardown();
  it("should allow admin to successfully create outofoffice for team members.", async () => {
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
      {
        id: 3,
        name: "User 3",
        username: "user-3",
        email: "user-3@test.com",
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
          role: MembershipRole.ADMIN,
          accepted: true,
        },
        {
          id: 2,
          teamId: teams[0].id,
          userId: users[1].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
        {
          id: 3,
          teamId: teams[0].id,
          userId: users[2].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    const { schedules, ...loggedInUser } = users[0];
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const startDate = new Date(getFutureDateUTC(5, TimeOfDay.START));
    const endDate = new Date(getFutureDateUTC(7, TimeOfDay.START));
    const expectEndDateString = getFutureDateUTC(7, TimeOfDay.END);
    const input: TOutOfOfficeInputSchema = {
      forUserId: users[1].id,
      dateRange: {
        startDate: new Date(getFutureDateUTC(5, TimeOfDay.START)),
        endDate: new Date(getFutureDateUTC(7, TimeOfDay.END)),
      },
      offset: 330,
      toTeamUserId: users[2].id,
      reasonId: 1,
    };

    const result = await outOfOfficeCreateOrUpdate({ ctx, input });
    expect(result).toStrictEqual({});

    //expect outOfOffice to be created in db for userId:1
    const ooo = await prismock.outOfOfficeEntry.findMany({
      where: {
        userId: users[1].id,
      },
    });
    expect(ooo.length).toEqual(1);
    expect(ooo[0].toUserId).toEqual(users[2].id);
  });

  it("should throw error when non-admin tries to create outofoffice for team members.", async () => {
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
      {
        id: 3,
        name: "User 3",
        username: "user-3",
        email: "user-3@test.com",
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
        {
          id: 3,
          teamId: teams[0].id,
          userId: users[2].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    const { schedules, ...loggedInUser } = users[0];
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const input: TOutOfOfficeInputSchema = {
      forUserId: users[1].id,
      dateRange: {
        startDate: new Date(getFutureDateUTC(5, TimeOfDay.START)),
        endDate: new Date(getFutureDateUTC(7, TimeOfDay.END)),
      },
      offset: 330,
      toTeamUserId: users[2].id,
      reasonId: 1,
    };

    try {
      await outOfOfficeCreateOrUpdate({ ctx, input });
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as { code: string }).code).toEqual("NOT_FOUND");
      expect((e as { message: string }).message).toBe("only_admin_can_create_ooo");
    }

    //expect outOfOffice Not to be created in db for userId:2
    const ooo = await prismock.outOfOfficeEntry.findMany({
      where: {
        userId: users[1].id,
      },
    });
    expect(ooo.length).toEqual(0);
  });

  it("should throw error while creating outofoffice for pending member.", async () => {
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
      {
        id: 3,
        name: "User 3",
        username: "user-3",
        email: "user-3@test.com",
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
          role: MembershipRole.ADMIN,
          accepted: true,
        },
        {
          id: 2,
          teamId: teams[0].id,
          userId: users[1].id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
        {
          id: 3,
          teamId: teams[0].id,
          userId: users[2].id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      ],
    });

    const { schedules, ...loggedInUser } = users[0];
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const input: TOutOfOfficeInputSchema = {
      forUserId: users[1].id,
      dateRange: {
        startDate: new Date(getFutureDateUTC(5, TimeOfDay.START)),
        endDate: new Date(getFutureDateUTC(7, TimeOfDay.END)),
      },
      offset: 330,
      toTeamUserId: users[2].id,
      reasonId: 1,
    };

    try {
      await outOfOfficeCreateOrUpdate({ ctx, input });
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as { code: string }).code).toEqual("NOT_FOUND");
      expect((e as { message: string }).message).toBe("only_admin_can_create_ooo");
    }

    //expect outOfOffice Not to be created in db for userId:2
    const ooo = await prismock.outOfOfficeEntry.findMany({
      where: {
        userId: users[1].id,
      },
    });
    expect(ooo.length).toEqual(0);
  });

  it("should throw error if reverse redirect already exists, for team member.", async () => {
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
      {
        id: 3,
        name: "User 3",
        username: "user-3",
        email: "user-3@test.com",
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
        {
          id: 3,
          teamId: teams[0].id,
          userId: users[2].id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    await prismock.outOfOfficeEntry.create({
      data: {
        userId: users[1].id,
        uuid: uuidv4(),
        start: new Date(getFutureDateUTC(5, TimeOfDay.START)),
        end: new Date(getFutureDateUTC(10, TimeOfDay.END)),
        notes: "",
        reasonId: 1,
        toUserId: users[2].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const { schedules, ...loggedInUser } = users[0];
    const ctx = {
      user: loggedInUser as NonNullable<TrpcSessionUser>,
    };

    const input: TOutOfOfficeInputSchema = {
      forUserId: users[2].id,
      dateRange: {
        startDate: new Date(getFutureDateUTC(7, TimeOfDay.START)),
        endDate: new Date(getFutureDateUTC(7, TimeOfDay.END)),
      },
      offset: 0,
      toTeamUserId: users[1].id,
      reasonId: 1,
    };

    try {
      await outOfOfficeCreateOrUpdate({ ctx, input });
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as { code: string }).code).toEqual("BAD_REQUEST");
      expect((e as { message: string }).message).toBe("ooo_team_redirect_infinite_not_allowed");
    }

    //expect new outOfOffice Not to be created in db for userId:3
    const ooo = await prismock.outOfOfficeEntry.findMany({
      where: {
        userId: users[2].id,
      },
    });
    expect(ooo.length).toEqual(0);
  });
});
