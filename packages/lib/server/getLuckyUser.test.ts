import prismaMock from "../../../tests/libs/__mocks__/prismaMock";

import { expect, it, describe } from "vitest";

import dayjs from "@calcom/dayjs";
import { buildUser, buildBooking } from "@calcom/lib/test/builder";

import { DistributionMethod, getLuckyUser } from "./getLuckyUser";

type NonEmptyArray<T> = [T, ...T[]];
type GetLuckyUserAvailableUsersType = NonEmptyArray<ReturnType<typeof buildUser>>;

it("can find lucky user with maximize availability", async () => {
  const users: GetLuckyUserAvailableUsersType = [
    buildUser({
      id: 1,
      username: "test1",
      name: "Test User 1",
      email: "test1@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        },
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
        },
      ],
    }),
    buildUser({
      id: 2,
      username: "test2",
      name: "Test User 2",
      email: "test2@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T04:30:00.000Z"),
        },
      ],
    }),
  ];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.host.findMany.mockResolvedValue([]);
  prismaMock.booking.findMany.mockResolvedValue([]);

  await expect(
    getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
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
  const users: GetLuckyUserAvailableUsersType = [
    buildUser({
      id: 1,
      username: "test1",
      name: "Test User 1",
      email: "test1@example.com",
      priority: 2,
      bookings: [
        {
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        },
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
        },
      ],
    }),
    buildUser({
      id: 2,
      username: "test2",
      name: "Test User 2",
      email: "test2@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T04:30:00.000Z"),
        },
      ],
    }),
  ];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.host.findMany.mockResolvedValue([]);
  prismaMock.booking.findMany.mockResolvedValue([]);

  // both users have medium priority (one user has no priority set, default to medium) so pick least recently booked
  await expect(
    getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
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
    email: "test1@example.com",
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
    email: "test2@example.com",
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
    email: "test2@example.com",
    priority: 4,
    bookings: [
      {
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      },
    ],
  });

  const usersWithPriorities: GetLuckyUserAvailableUsersType = [userLowest, userMedium, userHighest];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(usersWithPriorities);
  prismaMock.booking.findMany.mockResolvedValue([]);
  prismaMock.host.findMany.mockResolvedValue([]);
  // pick the user with the highest priority
  await expect(
    getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
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
    email: "test1@example.com",
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
    email: "test3@example.com",
    priority: 3,
    bookings: [
      {
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      },
    ],
  });

  const usersWithSamePriorities: GetLuckyUserAvailableUsersType = [
    userLow,
    userHighLeastRecentBooking,
    userHighRecentBooking,
  ];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(usersWithSamePriorities);
  prismaMock.booking.findMany.mockResolvedValue([]);
  prismaMock.host.findMany.mockResolvedValue([]);

  // pick the least recently booked user of the two with the highest priority
  await expect(
    getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
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
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        priority: 3,
        weight: 100,
        bookings: [
          {
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T03:30:00.000Z"),
          },
        ],
      }),
      buildUser({
        id: 2,
        username: "test2",
        name: "Test User 2",
        email: "test2@example.com",
        priority: 3,
        weight: 100,
        bookings: [
          {
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T04:30:00.000Z"),
          },
        ],
      }),
    ];
    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 1,
        userId: 1,
        createdAt: new Date("2022-01-25T06:30:00.000Z"),
      }),
      buildBooking({
        id: 2,
        userId: 1,
        createdAt: new Date("2022-01-25T03:30:00.000Z"),
      }),
      buildBooking({
        id: 3,
        userId: 2,
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      }),
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      }),
    ]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(users[1]);
  });

  it("can find lucky user if hosts have different weights", async () => {
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        priority: 3,
        weight: 200,
        bookings: [
          {
            createdAt: new Date("2022-01-25T08:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T07:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
          },
        ],
      }),
      buildUser({
        id: 2,
        username: "test2",
        name: "Test User 2",
        email: "test2@example.com",
        priority: 3,
        weight: 100,
        bookings: [
          {
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T03:30:00.000Z"),
          },
        ],
      }),
    ];

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 1,
        userId: 1,
        createdAt: new Date("2022-01-25T08:30:00.000Z"),
      }),
      buildBooking({
        id: 2,
        userId: 1,
        createdAt: new Date("2022-01-25T07:30:00.000Z"),
      }),
      buildBooking({
        id: 3,
        userId: 1,
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      }),
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: new Date("2022-01-25T06:30:00.000Z"),
      }),
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: new Date("2022-01-25T03:30:00.000Z"),
      }),
    ]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(users[0]);
  });

  it("can find lucky user with weights and adjusted weights", async () => {
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        priority: 3,
        weight: 150,
        bookings: [
          {
            createdAt: new Date("2022-01-25T07:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T03:30:00.000Z"),
          },
        ],
      }),
      buildUser({
        id: 2,
        username: "test2",
        name: "Test User 2",
        email: "test2@example.com",
        priority: 3,
        weight: 100,
        bookings: [
          {
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T03:30:00.000Z"),
          },
        ],
      }),
    ];

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 1,
        userId: 1,
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      }),
      buildBooking({
        id: 2,
        userId: 1,
        createdAt: new Date("2022-01-25T03:30:00.000Z"),
      }),
      buildBooking({
        id: 3,
        userId: 1,
        createdAt: new Date("2022-01-25T07:30:00.000Z"),
      }),
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: new Date("2022-01-25T06:30:00.000Z"),
      }),
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: new Date("2022-01-25T03:30:00.000Z"),
      }),
    ]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(users[0]);
  });

  it("applies calibration to newly added hosts so they are not penalized unfairly compared to their peers", async () => {
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        bookings: [
          {
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
          },
          {
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
          },
        ],
      }),
      buildUser({
        id: 2,
        username: "test2",
        name: "Test User 2",
        email: "test2@example.com",
        bookings: [
          {
            createdAt: new Date("2022-01-25T04:30:00.000Z"),
          },
        ],
      }),
    ];

    const middleOfMonth = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 14, 12, 0, 0)
    );

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email },
        weight: users[0].weight,
        createdAt: middleOfMonth,
      },
      {
        user: { id: users[1].id, email: users[1].email },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    // TODO: we may be able to use native prisma generics somehow?
    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([
      {
        userId: allRRHosts[0].user.id,
        weight: allRRHosts[0].weight,
        createdAt: allRRHosts[0].createdAt,
      },
    ]);
    // findMany bookings are BEFORE the new host (user 1) was added, calibration=2.
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: dayjs(middleOfMonth).subtract(2, "days").toDate(),
      }),
      buildBooking({
        id: 5,
        userId: 2,
        createdAt: dayjs(middleOfMonth).subtract(5, "days").toDate(),
      }),
    ]);
    await expect(
      getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(users[1]);
    // findMany bookings are AFTER the new host (user 1) was added, calibration=0.
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: dayjs(middleOfMonth).add(2, "days").toDate(),
      }),
      buildBooking({
        id: 5,
        userId: 2,
        createdAt: dayjs(middleOfMonth).add(5, "days").toDate(),
      }),
    ]);
    await expect(
      getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(users[0]);
  });
});
