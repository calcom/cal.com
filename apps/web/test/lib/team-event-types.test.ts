import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import {
  createBookingScenario,
  getScenarioData,
  getOrganizer,
  TestData,
  Timezones,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { expect, it, describe } from "vitest";

import { getLuckyUser } from "@calcom/lib/server";
import { buildUser } from "@calcom/lib/test/builder";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

it("can find lucky user with maximize availability", async () => {
  const user1 = buildUser({
    id: 1,
    username: "test1",
    name: "Test User 1",
    email: "test@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      },
      {
        createdAt: new Date("2022-01-25T06:30:00.000Z"),
      },
    ],
  });
  const user2 = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "tes2t@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      },
    ],
  });
  const users = [user1, user2];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.booking.findMany.mockResolvedValue([]);

  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: users,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
      },
      allRRHosts: [],
    })
  ).resolves.toStrictEqual(users[1]);
});

it("can find lucky user with maximize availability and priority ranking", async () => {
  const user1 = buildUser({
    id: 1,
    username: "test1",
    name: "Test User 1",
    email: "test@example.com",
    priority: 2,
    bookings: [
      {
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      },
      {
        createdAt: new Date("2022-01-25T06:30:00.000Z"),
      },
    ],
  });
  const user2 = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "tes2t@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      },
    ],
  });

  const users = [user1, user2];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.booking.findMany.mockResolvedValue([]);

  // both users have medium priority (one user has no priority set, default to medium) so pick least recently booked
  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: users,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
      },
      allRRHosts: [],
    })
  ).resolves.toStrictEqual(users[1]);

  const userLowest = buildUser({
    id: 1,
    username: "test1",
    name: "Test User 1",
    email: "test@example.com",
    priority: 0,
    bookings: [
      {
        createdAt: new Date("2022-01-25T03:30:00.000Z"),
      },
    ],
  });
  const userMedium = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "tes2t@example.com",
    priority: 2,
    bookings: [
      {
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      },
    ],
  });

  const userHighest = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "tes2t@example.com",
    priority: 4,
    bookings: [
      {
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      },
    ],
  });

  const usersWithPriorities = [userLowest, userMedium, userHighest];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(usersWithPriorities);
  prismaMock.booking.findMany.mockResolvedValue([]);

  // pick the user with the highest priority
  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: usersWithPriorities,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
      },
      allRRHosts: [],
    })
  ).resolves.toStrictEqual(usersWithPriorities[2]);

  const userLow = buildUser({
    id: 1,
    username: "test1",
    name: "Test User 1",
    email: "test@example.com",
    priority: 0,
    bookings: [
      {
        createdAt: new Date("2022-01-25T02:30:00.000Z"),
      },
    ],
  });
  const userHighLeastRecentBooking = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "tes2t@example.com",
    priority: 3,
    bookings: [
      {
        createdAt: new Date("2022-01-25T03:30:00.000Z"),
      },
    ],
  });

  const userHighRecentBooking = buildUser({
    id: 3,
    username: "test3",
    name: "Test User 3",
    email: "test3t@example.com",
    priority: 3,
    bookings: [
      {
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      },
    ],
  });

  const usersWithSamePriorities = [userLow, userHighLeastRecentBooking, userHighRecentBooking];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(usersWithSamePriorities);
  prismaMock.booking.findMany.mockResolvedValue([]);

  // pick the least recently booked user of the two with the highest priority
  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: usersWithSamePriorities,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
      },
      allRRHosts: [],
    })
  ).resolves.toStrictEqual(usersWithSamePriorities[1]);
});

describe("maximize availability and weights", () => {
  it("can find lucky user if hosts have same weights", async () => {
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const otherTeamMembers = [
      {
        name: "Other Team Member 1",
        username: "other-team-member-1",
        email: "other-team-member-1@example.com",
        id: 102,
        timeZone: Timezones["+5:30"],
      },
    ];

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
            schedulingType: SchedulingType.ROUND_ROBIN,
          },
        ],
        bookings: [
          {
            uid: "uid1",
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: "2022-01-26T05:30:00.000Z",
            endTime: "2022-01-26T06:30:00.000Z",
            createdAt: "2022-01-25T05:30:00.000Z",
          },
          {
            uid: "uid1",
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: "2022-01-26T03:30:00.000Z",
            endTime: "2022-01-26T03:30:00.000Z",
            createdAt: "2022-01-25T03:30:00.000Z",
          },
          {
            uid: "uid1",
            eventTypeId: 1,
            userId: 102,
            status: BookingStatus.ACCEPTED,
            startTime: "2022-01-26T06:30:00.000Z",
            endTime: "2022-01-26T07:30:00.000Z",
            createdAt: "2022-01-25T06:30:00.000Z",
          },
        ],
        organizer: organizer,
        usersApartFromOrganizer: otherTeamMembers,
      })
    );

    const builtOrganizer = buildUser({
      id: 101,
      name: "Organizer",
      email: "organizer@example.com",
      priority: 3,
      weight: 100,
    });

    const builtMember = buildUser({
      id: 102,
      name: otherTeamMembers[0].name,
      email: otherTeamMembers[0].email,
      priority: 3,
      weight: 100,
    });

    const allRRHosts = [
      {
        user: { id: builtOrganizer.id, email: builtOrganizer.email },
        weight: builtOrganizer.weight,
        weightAdjustment: builtOrganizer.weightAdjustment,
      },
      {
        user: { id: builtMember.id, email: builtMember.email },
        weight: builtMember.weight,
        weightAdjustment: builtMember.weightAdjustment,
      },
    ];

    await expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: [builtOrganizer, builtMember],
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(builtMember);
  });

  it("can find lucky user if hosts have different weights", async () => {
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const otherTeamMembers = [
      {
        name: "Other Team Member 1",
        username: "other-team-member-1",
        email: "other-team-member-1@example.com",
        id: 102,
        timeZone: Timezones["+5:30"],
      },
    ];

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
            schedulingType: SchedulingType.ROUND_ROBIN,
          },
        ],
        bookings: [
          {
            uid: "uid1",
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: "2022-01-26T05:30:00.000Z",
            endTime: "2022-01-26T06:30:00.000Z",
            createdAt: "2022-01-25T05:30:00.000Z",
          },
          {
            uid: "uid2",
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: "2022-01-26T03:30:00.000Z",
            endTime: "2022-01-26T03:30:00.000Z",
            createdAt: "2022-01-25T03:30:00.000Z",
          },
          {
            uid: "uid3",
            eventTypeId: 1,
            userId: 102,
            status: BookingStatus.ACCEPTED,
            startTime: "2022-01-26T02:30:00.000Z",
            endTime: "2022-01-26T02:30:00.000Z",
            createdAt: "2022-01-25T06:30:00.000Z",
          },
        ],
        organizer: organizer,
        usersApartFromOrganizer: otherTeamMembers,
      })
    );

    const builtOrganizer = buildUser({
      id: 101,
      name: "Organizer",
      email: "organizer@example.com",
      priority: 3,
      weight: 200,
    });

    const builtMember = buildUser({
      id: 102,
      name: otherTeamMembers[0].name,
      email: otherTeamMembers[0].email,
      priority: 3,
      weight: 100,
    });

    const allRRHosts = [
      {
        user: { id: builtOrganizer.id, email: builtOrganizer.email },
        weight: builtOrganizer.weight,
        weightAdjustment: builtOrganizer.weightAdjustment,
      },
      {
        user: { id: builtMember.id, email: builtMember.email },
        weight: builtMember.weight,
        weightAdjustment: builtMember.weightAdjustment,
      },
    ];

    await expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: [builtOrganizer, builtMember],
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(builtOrganizer);
  });
  //todo: test adjusted weights
});
