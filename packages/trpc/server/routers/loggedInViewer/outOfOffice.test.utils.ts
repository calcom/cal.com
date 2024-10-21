import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { InputUser } from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  addTeamsToDb,
  addUsers,
  mockNoTranslations,
  TestData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { v4 as uuidv4 } from "uuid";
import { beforeEach, afterEach } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

const cleanup = async () => {
  await prismock.user.deleteMany();
  await prismock.team.deleteMany();
  await prismock.membership.deleteMany();
  await prismock.outOfOfficeEntry.deleteMany();
};

export function setupAndTeardown() {
  beforeEach(async () => {
    await cleanup();
    mockNoTranslations();
  });

  afterEach(async () => {
    await cleanup();
  });
}

export enum TimeOfDay {
  START = "start",
  END = "end",
}

export function getFutureDateUTC(incrementDays: number, timeOfDay: TimeOfDay) {
  const currentDate = new Date();

  const updatedDate = new Date(currentDate);
  updatedDate.setDate(currentDate.getDate() + incrementDays);

  if (timeOfDay === TimeOfDay.START) {
    // Set time to start of day "00:00:00.000Z"
    updatedDate.setUTCHours(0, 0, 0, 0);
  } else if (timeOfDay === TimeOfDay.END) {
    // Set time to end of day "23:59:59.999Z"
    updatedDate.setUTCHours(23, 59, 59, 999);
  }

  return updatedDate.toISOString();
}

export async function populateOutOfOfficesForList() {
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
      timeZone: "Asia/Kolkata",
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
        start: getFutureDateUTC(2, TimeOfDay.START),
        end: getFutureDateUTC(2, TimeOfDay.END),
        notes: "",
        reasonId: 1,
        toUserId: users[1].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[0].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(4, TimeOfDay.START),
        end: getFutureDateUTC(5, TimeOfDay.END),
        notes: "",
        reasonId: 2,
        toUserId: users[2].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[0].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(7, TimeOfDay.START),
        end: getFutureDateUTC(7, TimeOfDay.END),
        notes: "",
        reasonId: 2,
        toUserId: users[3].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[1].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(9, TimeOfDay.START),
        end: getFutureDateUTC(10, TimeOfDay.END),
        notes: "",
        reasonId: 2,
        toUserId: users[2].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[1].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(12, TimeOfDay.START),
        end: getFutureDateUTC(12, TimeOfDay.END),
        notes: "",
        reasonId: 2,
        toUserId: users[0].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[2].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(14, TimeOfDay.START),
        end: getFutureDateUTC(16, TimeOfDay.END),
        notes: "",
        reasonId: 1,
        toUserId: users[3].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[2].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(18, TimeOfDay.START),
        end: getFutureDateUTC(18, TimeOfDay.END),
        notes: "",
        reasonId: 2,
        toUserId: users[0].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[3].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(20, TimeOfDay.START),
        end: getFutureDateUTC(20, TimeOfDay.END),
        notes: "",
        reasonId: 1,
        toUserId: users[1].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId: users[3].id,
        uuid: uuidv4(),
        start: getFutureDateUTC(22, TimeOfDay.START),
        end: getFutureDateUTC(22, TimeOfDay.END),
        notes: "",
        reasonId: 2,
        toUserId: users[0].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}
