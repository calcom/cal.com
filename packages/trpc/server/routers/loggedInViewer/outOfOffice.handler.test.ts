import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { InputUser } from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  addTeamsToDb,
  addUsers,
  mockNoTranslations,
  TestData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { v4 as uuidv4 } from "uuid";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../trpc";
import {
  outOfOfficeCreateOrUpdate,
  outOfOfficeEntriesList,
  outOfOfficeEntryDelete,
} from "./outOfOffice.handler";
import type {
  TOutOfOfficeDelete,
  TOutOfOfficeEntriesListSchema,
  TOutOfOfficeInputSchema,
} from "./outOfOffice.schema";

const cleanup = async () => {
  await prismock.user.deleteMany();
  await prismock.team.deleteMany();
  await prismock.membership.deleteMany();
  await prismock.outOfOfficeEntry.deleteMany();
};

function setupAndTeardown() {
  beforeEach(async () => {
    await cleanup();
    mockNoTranslations();
  });

  afterEach(async () => {
    await cleanup();
  });
}

async function populateOutOfOfficesForList() {
  const teams = [
    {
      id: 1,
      name: "Team 1",
      slug: "team-1",
    },
    {
      id: 2,
      name: "Team 2",
      slug: "team-2",
    },
  ];
  await addTeamsToDb(teams);

  const users: InputUser[] = [];
  for (let i = 0; i < 10; i++) {
    users.push({
      id: i + 1,
      name: `User ${i + 1}`,
      username: `user-${i + 1}`,
      email: `user-${i + 1}@test.com`,
      timeZone: "+5:30",
      schedules: [TestData.schedules.IstWorkHours],
    });
  }
  addUsers(users);

  //team-1 -> user-1(admin),user-2,user-3,user-4
  //team-2 -> user-5(admin),user-6,user-7
  //individuals -> user-8,user-9,user-10
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
      {
        id: 4,
        teamId: teams[0].id,
        userId: users[3].id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
      {
        id: 5,
        teamId: teams[1].id,
        userId: users[4].id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
      {
        id: 6,
        teamId: teams[1].id,
        userId: users[5].id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
      {
        id: 7,
        teamId: teams[1].id,
        userId: users[6].id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
      {
        id: 8,
        teamId: teams[1].id,
        userId: users[7].id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    ],
  });

  await prismock.outOfOfficeEntry.createMany({
    data: [
      {
        userId: users[0].id,
        uuid: uuidv4(),
        start: new Date("2024-09-03T00:00:00.000Z"),
        end: new Date("2024-09-03T23:59:59.999Z"),
        notes: "",
        reasonId: 1,
        toUserId: users[1].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[0].id,
        uuid: uuidv4(),
        start: new Date("2024-09-05T00:00:00.000Z"),
        end: new Date("2024-09-05T23:59:59.999Z"),
        notes: "",
        reasonId: 2,
        toUserId: users[2].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[0].id,
        uuid: uuidv4(),
        start: new Date("2024-09-07T00:00:00.000Z"),
        end: new Date("2024-09-07T23:59:59.999Z"),
        notes: "",
        reasonId: 2,
        toUserId: users[3].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[1].id,
        uuid: uuidv4(),
        start: new Date("2024-09-09T00:00:00.000Z"),
        end: new Date("2024-09-11T23:59:59.999Z"),
        notes: "",
        reasonId: 2,
        toUserId: users[2].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[1].id,
        uuid: uuidv4(),
        start: new Date("2024-09-13T00:00:00.000Z"),
        end: new Date("2024-09-15T23:59:59.999Z"),
        notes: "",
        reasonId: 2,
        toUserId: users[0].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[2].id,
        uuid: uuidv4(),
        start: new Date("2024-09-16T00:00:00.000Z"),
        end: new Date("2024-09-17T23:59:59.999Z"),
        notes: "",
        reasonId: 1,
        toUserId: users[3].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[2].id,
        uuid: uuidv4(),
        start: new Date("2024-09-19T00:00:00.000Z"),
        end: new Date("2024-09-21T23:59:59.999Z"),
        notes: "",
        reasonId: 2,
        toUserId: users[0].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[3].id,
        uuid: uuidv4(),
        start: new Date("2024-09-22T00:00:00.000Z"),
        end: new Date("2024-09-24T23:59:59.999Z"),
        notes: "",
        reasonId: 1,
        toUserId: users[1].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
      {
        userId: users[3].id,
        uuid: uuidv4(),
        start: new Date("2024-09-26T00:00:00.000Z"),
        end: new Date("2024-09-28T23:59:59.999Z"),
        notes: "",
        reasonId: 2,
        toUserId: users[0].id,
        createdAt: new Date("2024-09-01T00:00:00.000Z"),
        updatedAt: new Date("2024-09-01T00:00:00.000Z"),
      },
    ],
  });
}

describe("outOfOfficeHandler", () => {
  setupAndTeardown();

  describe("outOfOfficeCreateOrUpdate", () => {
    it("should successfully create outofoffice for logged-in user.", async () => {
      const users = [
        {
          id: 1,
          name: "User 1",
          username: "user-1",
          email: "user-1@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
      ];
      addUsers(users);

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        dateRange: {
          startDate: new Date("2024-10-01T00:00:00.000Z"),
          endDate: new Date("2024-10-01T00:00:00.000Z"),
        },
        offset: 330,
        toTeamUserId: null,
        reasonId: 1,
      };

      const result = await outOfOfficeCreateOrUpdate({ ctx, input });
      expect(result).toStrictEqual({});

      //expect outOfOffice to be created in db for userId:1
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          userId: users[0].id,
        },
      });
      expect(ooo.length).toEqual(1);

      //expect the start and end dates are stored in db are correct
      expect(ooo[0].start).toEqual("2024-10-01T00:00:00.000Z");
      expect(ooo[0].end).toEqual("2024-10-01T23:59:59.999Z");
    });

    it("should successfully create outofoffice with redirect for logged-in user.", async () => {
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
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

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        dateRange: {
          startDate: new Date("2024-10-28T00:00:00.000Z"),
          endDate: new Date("2024-10-30T00:00:00.000Z"),
        },
        offset: 330,
        toTeamUserId: users[1].id,
        reasonId: 1,
      };

      const result = await outOfOfficeCreateOrUpdate({ ctx, input });
      expect(result).toStrictEqual({});

      //expect outOfOffice to be created in db for userId:1
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          userId: users[0].id,
        },
      });
      expect(ooo.length).toEqual(1);

      //expect the start and end dates are stored in db are correct
      expect(ooo[0].start).toEqual("2024-10-28T00:00:00.000Z");
      expect(ooo[0].end).toEqual("2024-10-30T23:59:59.999Z");
    });

    it("should throw error while creating outofoffice with redirect to non team member.", async () => {
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
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
        ],
      });

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        dateRange: {
          startDate: new Date("2024-10-28T00:00:00.000Z"),
          endDate: new Date("2024-10-30T00:00:00.000Z"),
        },
        offset: 330,
        toTeamUserId: users[1].id,
        reasonId: 1,
      };

      try {
        await outOfOfficeCreateOrUpdate({ ctx, input });
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as { code: string }).code).toEqual("NOT_FOUND");
        expect((e as { message: string }).message).toBe("user_not_found");
      }

      //expect outOfOffice Not to be created in db for userId:1
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          userId: users[0].id,
        },
      });
      expect(ooo.length).toEqual(0);
    });

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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 3,
          name: "User 3",
          username: "user-3",
          email: "user-3@test.com",
          timeZone: "+5:30",
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

      const input: TOutOfOfficeInputSchema = {
        forUserId: users[1].id,
        dateRange: {
          startDate: new Date("2024-10-28T00:00:00.000Z"),
          endDate: new Date("2024-10-30T00:00:00.000Z"),
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

      //expect the start and end dates are stored in db are correct
      expect(ooo[0].start).toEqual("2024-10-28T00:00:00.000Z");
      expect(ooo[0].end).toEqual("2024-10-30T23:59:59.999Z");
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 3,
          name: "User 3",
          username: "user-3",
          email: "user-3@test.com",
          timeZone: "+5:30",
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
          startDate: new Date("2024-10-28T00:00:00.000Z"),
          endDate: new Date("2024-10-30T00:00:00.000Z"),
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 3,
          name: "User 3",
          username: "user-3",
          email: "user-3@test.com",
          timeZone: "+5:30",
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
          startDate: new Date("2024-10-28T00:00:00.000Z"),
          endDate: new Date("2024-10-30T00:00:00.000Z"),
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

    it("should throw error if outofoffice already exists, for logged-in user.", async () => {
      const users = [
        {
          id: 1,
          name: "User 1",
          username: "user-1",
          email: "user-1@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
      ];
      addUsers(users);

      await prismock.outOfOfficeEntry.create({
        data: {
          userId: users[0].id,
          uuid: uuidv4(),
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
        },
      });

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        dateRange: {
          startDate: new Date("2024-10-01T00:00:00.000Z"),
          endDate: new Date("2024-10-01T00:00:00.000Z"),
        },
        offset: 330,
        toTeamUserId: null,
        reasonId: 1,
      };

      try {
        await outOfOfficeCreateOrUpdate({ ctx, input });
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as { code: string }).code).toEqual("CONFLICT");
        expect((e as { message: string }).message).toBe("out_of_office_entry_already_exists");
      }

      //expect new outOfOffice Not to be created in db for userId:1
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          userId: users[0].id,
        },
      });
      expect(ooo.length).toEqual(1);
    });

    it("should throw error if outofoffice already exists, for team member.", async () => {
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
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
        ],
      });

      await prismock.outOfOfficeEntry.create({
        data: {
          userId: users[1].id,
          uuid: uuidv4(),
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
        },
      });

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        forUserId: users[1].id,
        dateRange: {
          startDate: new Date("2024-10-01T00:00:00.000Z"),
          endDate: new Date("2024-10-01T00:00:00.000Z"),
        },
        offset: 330,
        toTeamUserId: null,
        reasonId: 1,
      };

      try {
        await outOfOfficeCreateOrUpdate({ ctx, input });
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as { code: string }).code).toEqual("CONFLICT");
        expect((e as { message: string }).message).toBe("out_of_office_entry_already_exists");
      }

      //expect new outOfOffice Not to be created in db for userId:1
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          userId: users[1].id,
        },
      });
      expect(ooo.length).toEqual(1);
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 3,
          name: "User 3",
          username: "user-3",
          email: "user-3@test.com",
          timeZone: "+5:30",
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
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          toUserId: users[2].id,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
        },
      });

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        forUserId: users[2].id,
        dateRange: {
          startDate: new Date("2024-10-01T00:00:00.000Z"),
          endDate: new Date("2024-10-01T00:00:00.000Z"),
        },
        offset: 330,
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

    it("should throw error if reverse redirect already exists, for logged-in user", async () => {
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
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

      await prismock.outOfOfficeEntry.create({
        data: {
          userId: users[1].id,
          uuid: uuidv4(),
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          toUserId: users[0].id,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
        },
      });

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeInputSchema = {
        dateRange: {
          startDate: new Date("2024-10-01T00:00:00.000Z"),
          endDate: new Date("2024-10-01T00:00:00.000Z"),
        },
        offset: 330,
        toTeamUserId: users[1].id,
        reasonId: 1,
      };

      try {
        await outOfOfficeCreateOrUpdate({ ctx, input });
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as { code: string }).code).toEqual("BAD_REQUEST");
        expect((e as { message: string }).message).toBe("booking_redirect_infinite_not_allowed");
      }

      //expect new outOfOffice Not to be created in db for userId:1
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          userId: users[0].id,
        },
      });
      expect(ooo.length).toEqual(0);
    });
  });

  describe("outOfOfficeEntryDelete", () => {
    it("should successfully delete out of office for logged-in user.", async () => {
      const users = [
        {
          id: 1,
          name: "User 1",
          username: "user-1",
          email: "user-1@test.com",
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
      ];
      addUsers(users);

      const uuid = uuidv4();
      await prismock.outOfOfficeEntry.create({
        data: {
          userId: users[0].id,
          uuid,
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
        },
      });

      const { schedules, ...loggedInUser } = users[0];
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeDelete = {
        outOfOfficeUid: uuid,
      };

      const result = await outOfOfficeEntryDelete({ ctx, input });
      expect(result).toStrictEqual({});

      //expect outOfOffice to be deleted
      const ooo = await prismock.outOfOfficeEntry.findMany({
        where: {
          uuid,
        },
      });
      expect(ooo.length).toEqual(0);
    });

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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
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
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
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
          timeZone: "+5:30",
          schedules: [TestData.schedules.IstWorkHours],
        },
        {
          id: 2,
          name: "User 2",
          username: "user-2",
          email: "user-2@test.com",
          timeZone: "+5:30",
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
          start: new Date("2024-09-28T00:00:00.000Z"),
          end: new Date("2024-10-03T23:59:59.999Z"),
          notes: "",
          reasonId: 1,
          createdAt: new Date("2024-09-01T00:00:00.000Z"),
          updatedAt: new Date("2024-09-01T00:00:00.000Z"),
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

  describe("outOfOfficeEntriesList", () => {
    it("should list all out of office records for logged-in user.", async () => {
      await populateOutOfOfficesForList();
      const loggedInUser = {
        id: 1,
        name: "User 1",
        username: "user-1",
        email: "user-1@test.com",
        timeZone: "+5:30",
      };
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeEntriesListSchema = {
        limit: 5,
        fetchTeamMembersEntries: false,
      };

      const result = await outOfOfficeEntriesList({ ctx, input });
      //admin 'user-1' has 3 ooo records in populateOutOfOfficesForList()
      expect(result.rows.length).toEqual(3);
    });

    it("should list out of office records of team members for admin.", async () => {
      await populateOutOfOfficesForList();
      const loggedInUser = {
        id: 1,
        name: "User 1",
        username: "user-1",
        email: "user-1@test.com",
        timeZone: "+5:30",
      };
      const ctx = {
        user: loggedInUser as NonNullable<TrpcSessionUser>,
      };

      const input: TOutOfOfficeEntriesListSchema = {
        limit: 10,
        fetchTeamMembersEntries: true,
      };

      const result = await outOfOfficeEntriesList({ ctx, input });
      const uniqueUserIds = new Set(result.rows.map((ooo) => ooo.user.id));
      const team1MemberUserIds = new Set([2, 3, 4]); //refer populateOutOfOfficesForList()
      expect(uniqueUserIds).toEqual(team1MemberUserIds);
    });
  });
});
