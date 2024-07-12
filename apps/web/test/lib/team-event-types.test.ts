import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { expect, it, describe, beforeEach } from "vitest";

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

type MockUser = ReturnType<typeof buildUser> & {
  bookings?: {
    attendees?: {
      id: number;
      noShow: boolean;
      email: string;
    }[];
    createdAt: string;
    noShowHost?: boolean;
  }[];
};

const mockData = {
  users: [] as MockUser[],
};

const mockUserInDb = (user: MockUser) => {
  mockData.users.push(user);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  prismaMock.user.findMany.mockImplementation(({ where }) => {
    return new Promise((resolve) => {
      const users: { bookings: { createdAt: string }[]; id: number }[] = [];
      where.id.in.forEach((userId: number) => {
        const matchingUser = mockData.users.find((user) => user.id === userId);
        if (matchingUser) {
          const bookings = matchingUser?.bookings?.filter((booking) => {
            return booking.attendees
              ? booking.attendees.some((attendee) => !attendee.noShow)
              : true && booking.noShowHost !== true;
          });
          const latestBooking = bookings?.sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
          )[0];
          users.push({
            bookings: latestBooking ? [{ createdAt: latestBooking.createdAt }] : [],
            id: matchingUser.id,
          });
        }
      });
      resolve(users);
    });
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  prismaMock.booking.findMany.mockImplementation(() => {
    return new Promise((resolve) => {
      const availableUserEmails = mockData.users.map((user) => user.email);

      const bookings = mockData.users.reduce(
        (acc: { createdAt: string; attendees: { email: string }[] }[], user) => {
          if (user.bookings) {
            user.bookings.forEach((booking) => {
              if (
                booking.attendees &&
                booking.attendees.some(
                  (attendee) => availableUserEmails.includes(attendee.email) && !attendee.noShow
                )
              ) {
                acc.push({
                  createdAt: booking.createdAt,
                  attendees: booking.attendees.filter((attendee) =>
                    availableUserEmails.includes(attendee.email)
                  ),
                });
              }
            });
          }
          return acc;
        },
        []
      );

      const sortedBookings = bookings.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      resolve(sortedBookings);
    });
  });
};

describe("should not consider no show bookings for round robin assignment when: ", async () => {
  beforeEach(() => {
    mockData.users = [];
  });
  it("Host is noShow", () => {
    const user1 = buildUser({
      id: 1,
      username: "test1",
      name: "Test User 1",
      email: "test@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        },
      ],
    });

    mockUserInDb(user1);

    const user2 = buildUser({
      id: 2,
      username: "test2",
      name: "Test User 2",
      email: "test2@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
          noShowHost: true,
        },
      ],
    });

    mockUserInDb(user2);

    const users = [user1, user2];

    prismaMock.booking.findMany.mockResolvedValue([]);
    expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: users,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual(users[1]);
  });
  it("Attendee is noShow", () => {
    const user1 = buildUser({
      id: 1,
      username: "test1",
      name: "Test User 1",
      email: "test@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        },
      ],
    });

    mockUserInDb(user1);

    const user2 = buildUser({
      id: 2,
      username: "test2",
      name: "Test User 2",
      email: "test2@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
          attendees: [
            {
              id: 1,
              noShow: true,
            },
          ],
        },
      ],
    });

    mockUserInDb(user2);

    const users = [user1, user2];

    prismaMock.booking.findMany.mockResolvedValue([]);
    expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: users,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual(users[1]);
  });
  it("one of the hosts is attendee and was no show", () => {
    const user1 = buildUser({
      id: 1,
      username: "test1",
      name: "Test User 1",
      email: "test@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        },
      ],
    });

    mockUserInDb(user1);

    const user2 = buildUser({
      id: 2,
      username: "test2",
      name: "Test User 2",
      email: "test2@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
        },
        // User2 is fixed user, User 3 was selected as round robin host but did not show up so this booking should be counted for User 3
        {
          createdAt: new Date("2022-01-25T07:30:00.000Z"),
          attendees: [
            {
              email: "test3@example.com",
              noShow: true,
            },
          ],
        },
      ],
    });

    mockUserInDb(user2);

    const user3 = buildUser({
      id: 3,
      username: "test3",
      name: "Test user 3",
      email: "test3@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25T04:30:00.000Z"),
        },
      ],
    });

    mockUserInDb(user3);

    const users = [user1, user2, user3];

    expect(
      getLuckyUser("MAXIMIZE_AVAILABILITY", {
        availableUsers: users,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual(users[2]);
  });
});
