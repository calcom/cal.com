import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { expect, it, describe } from "vitest";

import { getLuckyUser } from "@calcom/lib/server";
import { buildUser, buildBooking } from "@calcom/lib/test/builder";
import { addWeightAdjustmentToNewHosts } from "@calcom/trpc/server/routers/viewer/eventTypes/util";

it("can find lucky user with maximize availability", async () => {
  const user1 = buildUser({
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
  });
  const user2 = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "test2@example.com",
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
  });
  const user2 = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "test2@example.com",
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
    const user1 = buildUser({
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
    });
    const user2 = buildUser({
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
    });

    prismaMock.user.findMany.mockResolvedValue([user1, user2]);

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
        user: { id: user1.id, email: user1.email },
        weight: user1.weight,
        weightAdjustment: user1.weightAdjustment,
      },
      {
        user: { id: user2.id, email: user2.email },
        weight: user2.weight,
        weightAdjustment: user2.weightAdjustment,
      },
    ];

    await expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: [user1, user2],
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(user2);
  });

  it("can find lucky user if hosts have different weights", async () => {
    const user1 = buildUser({
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
    });
    const user2 = buildUser({
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
    });

    prismaMock.user.findMany.mockResolvedValue([user1, user2]);

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
        user: { id: user1.id, email: user1.email },
        weight: user1.weight,
        weightAdjustment: user1.weightAdjustment,
      },
      {
        user: { id: user2.id, email: user2.email },
        weight: user2.weight,
        weightAdjustment: user2.weightAdjustment,
      },
    ];

    await expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: [user1, user2],
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(user1);
  });

  it("can find lucky user with weights and adjusted weights", async () => {
    const user1 = buildUser({
      id: 1,
      username: "test1",
      name: "Test User 1",
      email: "test1@example.com",
      priority: 3,
      weight: 150,
      weightAdjustment: 4, // + 3 = 7 bookings
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
    });
    const user2 = buildUser({
      id: 2,
      username: "test2",
      name: "Test User 2",
      email: "test2@example.com",
      priority: 3,
      weight: 100,
      weightAdjustment: 3, // + 2 = 5 bookings
      bookings: [
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
        },
        {
          createdAt: new Date("2022-01-25T03:30:00.000Z"),
        },
      ],
    });

    prismaMock.user.findMany.mockResolvedValue([user1, user2]);

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
        user: { id: user1.id, email: user1.email },
        weight: user1.weight,
        weightAdjustment: user1.weightAdjustment,
      },
      {
        user: { id: user2.id, email: user2.email },
        weight: user2.weight,
        weightAdjustment: user2.weightAdjustment,
      },
    ];

    await expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: [user1, user2],
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
        },
        allRRHosts,
      })
    ).resolves.toStrictEqual(user1);
  });
});

function convertHostsToUsers(
  hosts: {
    userId: number;
    isFixed: boolean;
    priority: number;
    weight: number;
    weightAdjustment?: number;
    newHost?: boolean;
  }[]
) {
  return hosts.map((host) => {
    return {
      id: host.userId,
      email: `test${host.userId}@example.com`,
      hosts: host.newHost
        ? []
        : [
            {
              isFixed: host.isFixed,
              priority: host.priority,
              weightAdjustment: host.weightAdjustment,
              weight: host.weight,
            },
          ],
    };
  });
}

describe("addWeightAdjustmentToNewHosts", () => {
  it("weight adjustment is correctly added to host with two hosts that have the same weight", async () => {
    const hosts = [
      {
        userId: 1,
        isFixed: false,
        priority: 2,
        weight: 100,
      },
      {
        userId: 2,
        isFixed: false,
        priority: 2,
        weight: 100,
        newHost: true,
      },
    ];

    const users = convertHostsToUsers(hosts);

    prismaMock.user.findMany.mockResolvedValue(users);

    // mock for allBookings (for ongoing RR hosts)
    prismaMock.booking.findMany
      .mockResolvedValueOnce([
        buildBooking({
          id: 1,
          userId: 1,
        }),
        buildBooking({
          id: 2,
          userId: 1,
        }),
        buildBooking({
          id: 3,
          userId: 1,
        }),
        buildBooking({
          id: 4,
          userId: 1,
        }),
      ])
      // mock for bookings of new RR host
      .mockResolvedValueOnce([
        buildBooking({
          id: 5,
          userId: 2,
        }),
      ]);

    const hostsWithAdjustedWeight = await addWeightAdjustmentToNewHosts({
      hosts,
      isWeightsEnabled: true,
      eventTypeId: 1,
      prisma: prismaMock,
    });
    /*
    both users have weight 100, user1 has 4 bookings user 2 has 1 bookings already
    */
    expect(hostsWithAdjustedWeight.find((host) => host.userId === 2)?.weightAdjustment).toBe(3);
  });

  it("weight adjustment is correctly added to host with several hosts that have different weights", async () => {
    // make different weights
    const hosts = [
      {
        userId: 1,
        isFixed: false,
        priority: 2,
        weight: 100,
      },
      {
        userId: 2,
        isFixed: false,
        priority: 2,
        weight: 200,
        newHost: true,
      },
      {
        userId: 3,
        isFixed: false,
        priority: 2,
        weight: 200,
      },
      {
        userId: 4,
        isFixed: false,
        priority: 2,
        weight: 100,
      },
      {
        userId: 5,
        isFixed: false,
        priority: 2,
        weight: 50,
        newHost: true,
      },
    ];

    const users = convertHostsToUsers(hosts);

    prismaMock.user.findMany.mockResolvedValue(users);

    // mock for allBookings (for ongoing RR hosts)
    prismaMock.booking.findMany
      .mockResolvedValueOnce([
        // 8 bookings for ongoing hosts (hosts that already existed before)
        buildBooking({
          id: 1,
          userId: 1,
        }),
        buildBooking({
          id: 2,
          userId: 1,
        }),
        buildBooking({
          id: 3,
          userId: 3,
        }),
        buildBooking({
          id: 4,
          userId: 3,
        }),
        buildBooking({
          id: 5,
          userId: 4,
        }),
        buildBooking({
          id: 6,
          userId: 4,
        }),
        buildBooking({
          id: 7,
          userId: 4,
        }),
        buildBooking({
          id: 8,
          userId: 4,
        }),
      ])
      // mock for bookings of new RR host
      .mockResolvedValueOnce([
        buildBooking({
          id: 5,
          userId: 2,
        }),
      ])
      .mockResolvedValue([]);

    const hostsWithAdjustedWeight = await addWeightAdjustmentToNewHosts({
      hosts,
      isWeightsEnabled: true,
      eventTypeId: 1,
      prisma: prismaMock,
    });

    // 8 bookings from ongoing hosts, 400 total weight --> average 0.02 bookings per weight unit --> 0.02 * 200 = 4 - 1 prev bookings = 3
    expect(hostsWithAdjustedWeight.find((host) => host.userId === 2)?.weightAdjustment).toBe(3);

    // 8 bookings from ongoing hosts, 400 total weight --> average 0.02 bookings per weight unit --> 0.02 * 50 = 1 (no prev bookings)
    expect(hostsWithAdjustedWeight.find((host) => host.userId === 5)?.weightAdjustment).toBe(1);
  });
});
