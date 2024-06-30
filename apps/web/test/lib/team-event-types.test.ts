import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { expect, it } from "vitest";

import { getLuckyUser } from "@calcom/lib/server";
import { buildUser } from "@calcom/lib/test/builder";

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
      eventTypeId: 1,
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
  const test = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
    availableUsers: users,
    eventTypeId: 1,
  });

  // both users have medium priority (one user has no priority set, default to medium) so pick least recently booked
  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: users,
      eventTypeId: 1,
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
      eventTypeId: 1,
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
      eventTypeId: 1,
    })
  ).resolves.toStrictEqual(usersWithSamePriorities[1]);
});
