import CalendarManagerMock from "@calcom/features/calendars/lib/__mocks__/CalendarManager";
import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import dayjs from "@calcom/dayjs";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import { buildBooking, buildUser } from "@calcom/lib/test/builder";
import { AttributeType, RRResetInterval, RRTimestampBasis } from "@calcom/prisma/enums";
import { v4 as uuid } from "uuid";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getIntervalEndDate, getIntervalStartDate } from "./getLuckyUser";

const luckyUserService = getLuckyUserService();

type NonEmptyArray<T> = [T, ...T[]];
type GetLuckyUserAvailableUsersType = NonEmptyArray<ReturnType<typeof buildUser>>;

vi.mock("@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));

beforeAll(() => {
  vi.setSystemTime(new Date("2021-06-20T11:59:59Z"));
});

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

  CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
  prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);

  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.host.findMany.mockResolvedValue([]);
  prismaMock.booking.findMany.mockResolvedValue([]);

  await expect(
    luckyUserService.getLuckyUser({
      availableUsers: users,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        includeNoShowInRRCalculation: false,
      },
      allRRHosts: [],
      routingFormResponse: null,
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

  CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
  prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);

  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.host.findMany.mockResolvedValue([]);
  prismaMock.booking.findMany.mockResolvedValue([]);

  // both users have medium priority (one user has no priority set, default to medium) so pick least recently booked
  await expect(
    luckyUserService.getLuckyUser({
      availableUsers: users,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: {
          rrResetInterval: RRResetInterval.MONTH,
          rrTimestampBasis: RRTimestampBasis.CREATED_AT,
        },
        includeNoShowInRRCalculation: false,
      },
      allRRHosts: [],
      routingFormResponse: null,
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
  prismaMock.user.findMany.mockResolvedValue(usersWithPriorities);
  prismaMock.booking.findMany.mockResolvedValue([]);
  prismaMock.host.findMany.mockResolvedValue([]);
  // pick the user with the highest priority
  await expect(
    luckyUserService.getLuckyUser({
      availableUsers: usersWithPriorities,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        includeNoShowInRRCalculation: false,
      },
      allRRHosts: [],
      routingFormResponse: null,
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
  prismaMock.user.findMany.mockResolvedValue(usersWithSamePriorities);
  prismaMock.booking.findMany.mockResolvedValue([]);
  prismaMock.host.findMany.mockResolvedValue([]);

  // pick the least recently booked user of the two with the highest priority
  await expect(
    luckyUserService.getLuckyUser({
      availableUsers: usersWithSamePriorities,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        includeNoShowInRRCalculation: false,
      },
      allRRHosts: [],
      routingFormResponse: null,
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

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);
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
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[1]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, monthly interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-01T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
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

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);
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
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.DAY, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[0]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, daily interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-20T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
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

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);
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
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.DAY, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[0]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, daily interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-20T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
  });

  it("applies calibration when user had OOO entries this month", async () => {
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        bookings: [],
      }),
      buildUser({
        id: 2,
        username: "test2",
        name: "Test User 2",
        email: "test2@example.com",
        bookings: [],
      }),
    ];

    const allRRHosts = [
      {
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });

    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([
      {
        start: dayjs().subtract(10, "day").toDate(),
        end: dayjs().subtract(5, "day").toDate(),
        userId: users[0].id,
      },
    ]);

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([
      {
        userId: allRRHosts[0].user.id,
        weight: allRRHosts[0].weight,
        createdAt: allRRHosts[0].createdAt,
      },
    ]);

    // bookings of current month
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 4,
        userId: 1,
        createdAt: dayjs().subtract(2, "days").toDate(),
      }),
      // happened during OOO of userId 1
      buildBooking({
        id: 4,
        userId: 2,
        createdAt: dayjs().subtract(6, "days").toDate(),
      }),
      // happened during OOO of userId 1
      buildBooking({
        id: 5,
        userId: 2,
        createdAt: dayjs().subtract(7, "days").toDate(),
      }),
    ]);

    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[1]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, monthly interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-01T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
  });

  it("applies calibration when user had full day calendar events this month", async () => {
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

    const allRRHosts = [
      {
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    CalendarManagerMock.getBusyCalendarTimes
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            start: dayjs().utc().startOf("month").toDate(),
            end: dayjs().utc().startOf("month").add(3, "day").toDate(),
            timeZone: "UTC",
          },
        ],
      })
      .mockResolvedValue([]);

    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([
      {
        userId: allRRHosts[0].user.id,
        weight: allRRHosts[0].weight,
        createdAt: allRRHosts[0].createdAt,
      },
    ]);

    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 1,
        userId: 1,
        createdAt: dayjs().startOf("month").add(10, "day").toDate(),
      }),
      // happened during OOO
      buildBooking({
        id: 2,
        userId: 2,
        createdAt: dayjs().startOf("month").add(5, "hour").toDate(),
      }),
      // happened during OOO
      buildBooking({
        id: 3,
        userId: 2,
        createdAt: dayjs().startOf("month").add(20, "hour").toDate(),
      }),
    ]);

    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[1]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, monthly interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-01T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
  });

  it("skips OOO calibration when there is only one host", async () => {
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        bookings: [],
      }),
    ];

    const allRRHosts = [
      {
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
    ];

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });

    // Mock OOO entry for the single host
    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([
      {
        start: dayjs().subtract(10, "day").toDate(),
        end: dayjs().subtract(5, "day").toDate(),
        userId: users[0].id,
      },
    ]);

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([
      {
        userId: allRRHosts[0].user.id,
        weight: allRRHosts[0].weight,
        createdAt: allRRHosts[0].createdAt,
      },
    ]);

    // Mock some bookings during the OOO period (though there's only one host)
    prismaMock.booking.findMany.mockResolvedValue([
      buildBooking({
        id: 1,
        userId: 1,
        createdAt: dayjs().subtract(7, "days").toDate(),
      }),
    ]);

    // Should return the only available user without throwing division by zero error
    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
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
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: middleOfMonth,
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([
      {
        userId: allRRHosts[0].user.id,
        weight: allRRHosts[0].weight,
        createdAt: allRRHosts[0].createdAt,
      },
    ]);
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.findMany.mockResolvedValueOnce([
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
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[1]);

    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.findMany.mockResolvedValueOnce([
      // Mock 6: All hosts
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
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[0]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, monthly interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-01T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
  });
});

describe("attribute weights and virtual queues", () => {
  it("prepareQueuesAndAttributesData returns correct attributeWeights and virtualQueuesData", async () => {
    const attributeOneOptionIdFirst = uuid();
    const attributeOneOptionIdSecond = uuid();
    const attributeTwoOptionIdFirst = uuid();
    const attributeTwoOptionIdSecond = uuid();
    const attributeId = uuid();
    const routeId = uuid();
    const fieldIdOne = uuid();
    const fieldIdTwo = uuid();

    const routingFormResponse = {
      response: {
        [fieldIdOne]: {
          label: "company_size",
          value: attributeOneOptionIdFirst,
        },
        [fieldIdTwo]: { label: "headquarters", value: attributeTwoOptionIdSecond },
      },
      form: {
        routes: [
          {
            id: uuid(),
            action: { type: "eventTypeRedirectUrl", value: "team/team1/team1-event-1", eventTypeId: 29 },
            queryValue: { id: "a98ab8a9-4567-489a-bcde-f1932649bb8b", type: "group" },
            attributesQueryValue: {
              id: "b8ab8ba9-0123-4456-b89a-b1932649bb8b",
              type: "group",
              children1: {
                "a8999bb9-89ab-4cde-b012-31932649cc93": {
                  type: "rule",
                  properties: {
                    field: uuid(), //another attribute
                    value: [[`{field:${fieldIdOne}}`]],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributeRoutingConfig: {},
          },
          {
            //chosen route
            id: routeId,
            attributeIdForWeights: attributeId,
            action: { type: "eventTypeRedirectUrl", value: "team/team1/team1-event-1", eventTypeId: 29 },
            queryValue: { id: "a98ab8a9-4567-489a-bcde-f1932649bb8b", type: "group" },
            attributesQueryValue: {
              id: "b8ab8ba9-0123-4456-b89a-b1932649bb8b",
              type: "group",
              children1: {
                "a8999bb9-89ab-4cde-b012-31932649cc93": {
                  type: "rule",
                  properties: {
                    field: attributeId,
                    value: [[`{field:${fieldIdTwo}}`]],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributeRoutingConfig: {},
          },
        ],
        fields: [
          {
            id: fieldIdOne,
            type: "select",
            label: "company_size",
            options: [
              { id: attributeOneOptionIdFirst, label: "1-10" },
              { id: attributeOneOptionIdSecond, label: "11-20" },
            ],
            required: true,
          },
          {
            id: fieldIdTwo,
            type: "select",
            label: "headquarters",
            options: [
              { id: attributeTwoOptionIdFirst, label: "USA" },
              { id: attributeTwoOptionIdSecond, label: "Germany" },
            ],
            required: true,
          },
        ],
      },
      chosenRouteId: routeId,
    };

    prismaMock.attribute.findUnique.mockResolvedValue({
      name: "Headquaters",
      id: attributeId,
      type: AttributeType.SINGLE_SELECT,
      slug: "headquarters",
      options: [
        {
          id: "12345",
          value: "Germany",
          slug: "Germany",
          assignedUsers: [
            {
              weight: 120,
              member: {
                userId: 1,
              },
            },
            {
              weight: 150,
              member: {
                userId: 2,
              },
            },
          ],
        },
      ],
    });

    const queuesAndAttributesData = await luckyUserService.prepareQueuesAndAttributesData({
      eventType: {
        id: 1,
        isRRWeightsEnabled: true,
        team: {
          parentId: 1,
          rrResetInterval: RRResetInterval.DAY,
          rrTimestampBasis: RRTimestampBasis.CREATED_AT,
        },
        includeNoShowInRRCalculation: false,
      },
      routingFormResponse,
      allRRHosts: [
        {
          user: {
            id: 1,
            email: "test1@example.com",
            credentials: [],
            userLevelSelectedCalendars: [],
          },
          createdAt: new Date(),
          weight: 10,
        },
        {
          user: {
            id: 2,
            email: "test2@example.com",
            credentials: [],
            userLevelSelectedCalendars: [],
          },
          createdAt: new Date(),
          weight: 150,
        },
      ],
    });

    expect(queuesAndAttributesData).toEqual({
      attributeWeights: [
        { userId: 1, weight: 120 },
        { userId: 2, weight: 150 },
      ],
      virtualQueuesData: {
        chosenRouteId: routeId,
        fieldOptionData: {
          fieldId: fieldIdTwo,
          selectedOptionIds: attributeTwoOptionIdSecond,
        },
      },
    });
  });

  it("prepareQueuesAndAttributesData returns host weights as fallback when no members are assigned to the attribute", async () => {
    const attributeOptionIdFirst = uuid();
    const attributeOptionIdSecond = uuid();
    const attributeId = uuid();
    const routeId = uuid();
    const fieldId = uuid();

    const routingFormResponse = {
      response: {
        [fieldId]: { label: "headquarters", value: attributeOptionIdSecond },
      },
      form: {
        routes: [
          {
            id: uuid(),
            action: { type: "eventTypeRedirectUrl", value: "team/team1/team1-event-1", eventTypeId: 29 },
            queryValue: { id: "a98ab8a9-4567-489a-bcde-f1932649bb8b", type: "group" },
            attributesQueryValue: {
              id: "b8ab8ba9-0123-4456-b89a-b1932649bb8b",
              type: "group",
              children1: {
                "a8999bb9-89ab-4cde-b012-31932649cc93": {
                  type: "rule",
                  properties: {
                    field: uuid(), //another attribute
                    value: [[`{field:${fieldId}}`]],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributeRoutingConfig: {},
          },
          {
            //chosen route
            id: routeId,
            attributeIdForWeights: attributeId,
            action: { type: "eventTypeRedirectUrl", value: "team/team1/team1-event-1", eventTypeId: 29 },
            queryValue: { id: "a98ab8a9-4567-489a-bcde-f1932649bb8b", type: "group" },
            attributesQueryValue: {
              id: "b8ab8ba9-0123-4456-b89a-b1932649bb8b",
              type: "group",
              children1: {
                "a8999bb9-89ab-4cde-b012-31932649cc93": {
                  type: "rule",
                  properties: {
                    field: attributeId,
                    value: [[`{field:${fieldId}}`]],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributeRoutingConfig: {},
          },
        ],
        fields: [
          {
            id: fieldId,
            type: "select",
            label: "headquarters",
            options: [
              { id: attributeOptionIdFirst, label: "USA" },
              { id: attributeOptionIdSecond, label: "Germany" },
            ],
            required: true,
          },
        ],
      },
      chosenRouteId: routeId,
    };

    prismaMock.attribute.findUnique.mockResolvedValue({
      name: "Headquaters",
      id: attributeId,
      type: AttributeType.SINGLE_SELECT,
      slug: "headquarters",
      options: [
        {
          id: "12345",
          value: "Germany",
          slug: "Germany",
          assignedUsers: [],
        },
      ],
    });

    const queuesAndAttributesData = await luckyUserService.prepareQueuesAndAttributesData({
      eventType: {
        id: 1,
        isRRWeightsEnabled: true,
        team: {
          parentId: 1,
          rrResetInterval: RRResetInterval.DAY,
          rrTimestampBasis: RRTimestampBasis.CREATED_AT,
        },
        includeNoShowInRRCalculation: false,
      },
      routingFormResponse,
      allRRHosts: [
        {
          user: {
            id: 1,
            email: "test1@example.com",
            credentials: [],
            userLevelSelectedCalendars: [],
          },
          createdAt: new Date(),
          weight: 10,
        },
        {
          user: {
            id: 2,
            email: "test2@example.com",
            credentials: [],
            userLevelSelectedCalendars: [],
          },
          createdAt: new Date(),
          weight: 150,
        },
      ],
    });

    expect(queuesAndAttributesData.attributeWeights).toEqual([
      { userId: 1, weight: 10 },
      { userId: 2, weight: 150 },
    ]);
  });

  it("uses attribute weights and counts only bookings within virtual queue", async () => {
    const users: GetLuckyUserAvailableUsersType = [
      buildUser({
        id: 1,
        username: "test1",
        name: "Test User 1",
        email: "test1@example.com",
        priority: 1,
        weight: 150,
        bookings: [
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
        priority: 3,
        weight: 50,
        bookings: [
          {
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
          },
        ],
      }),
    ];

    const attributeOptionIdFirst = uuid();
    const attributeOptionIdSecond = uuid();
    const attributeId = uuid();
    const routeId = uuid();
    const fieldId = uuid();
    const formId = uuid();

    const routingFormResponse = {
      response: {
        [fieldId]: {
          label: "company_size",
          value: attributeOptionIdFirst,
        },
      },
      form: {
        routes: [
          {
            id: routeId,
            action: { type: "eventTypeRedirectUrl", value: "team/team1/team1-event-1", eventTypeId: 29 },
            queryValue: { id: "a98ab8a9-4567-489a-bcde-f1932649bb8b", type: "group" },
            attributeIdForWeights: attributeId,
            attributesQueryValue: {
              id: "b8ab8ba9-0123-4456-b89a-b1932649bb8b",
              type: "group",
              children1: {
                "a8999bb9-89ab-4cde-b012-31932649cc93": {
                  type: "rule",
                  properties: {
                    field: attributeId,
                    value: [[`{field:${fieldId}}`]],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributeRoutingConfig: {},
          },
        ],
        fields: [
          {
            id: fieldId,
            type: "select",
            label: "company_size",
            options: [
              { id: attributeOptionIdFirst, label: "1-10" },
              { id: attributeOptionIdSecond, label: "11-20" },
            ],
            required: true,
          },
        ],
      },
      chosenRouteId: routeId,
    };

    CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue({ success: true, data: [] });
    prismaMock.outOfOfficeEntry.findMany.mockResolvedValue([]);

    prismaMock.user.findMany.mockResolvedValue(users);
    prismaMock.host.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...buildBooking({
          id: 1,
          userId: 1,
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
        }),
        routedFromRoutingFormReponse: {
          id: 1,
          formId,
          response: {
            [fieldId]: {
              label: "company_size",
              value: attributeOptionIdFirst,
            },
          },
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
          chosenRouteId: routeId,
        },
      },
      {
        ...buildBooking({
          id: 3,
          userId: 2,
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        }),
        routedFromRoutingFormReponse: {
          id: 1,
          formId,
          response: {
            [fieldId]: {
              label: "company_size",
              value: attributeOptionIdFirst,
            },
          },
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
          chosenRouteId: routeId,
        },
      },
      {
        ...buildBooking({
          id: 3,
          userId: 2,
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        }),
        routedFromRoutingFormReponse: {
          id: 1,
          formId,
          response: {
            [fieldId]: {
              label: "company_size",
              value: attributeOptionIdSecond,
            },
          },
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
          chosenRouteId: routeId,
        },
      },
    ]);

    prismaMock.attribute.findUnique.mockResolvedValue({
      name: "Company Size",
      id: attributeId,
      type: AttributeType.SINGLE_SELECT,
      slug: "company_size",
      options: [
        {
          id: "4321",
          value: "1-10",
          slug: "1-10",
          assignedUsers: [
            {
              weight: 80,
              member: {
                userId: 1,
              },
            },
            {
              weight: 100,
              member: {
                userId: 2,
              },
            },
          ],
        },
      ],
    });

    const allRRHosts = [
      {
        user: {
          id: users[0].id,
          email: users[0].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: {
          id: users[1].id,
          email: users[1].email,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      luckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: {
            parentId: 1,
            rrResetInterval: RRResetInterval.DAY,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          },
          includeNoShowInRRCalculation: false,
        },
        allRRHosts,
        routingFormResponse,
      })
    ).resolves.toStrictEqual(users[1]);

    const queryArgs = prismaMock.booking.findMany.mock.calls[0][0];

    // Today: 2021-06-20T11:59:59Z, daily interval
    expect(queryArgs.where?.createdAt).toEqual(
      expect.objectContaining({
        gte: new Date("2021-06-20T00:00:00Z"),
        lte: new Date("2021-06-20T11:59:59.000Z"),
      })
    );
  });
});

describe("get interval times", () => {
  it("should get correct interval start time with meeting started timestamp basis and DAY interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = getIntervalStartDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-15T00:00:00Z"));
  });

  it("should get correct interval start time with meeting started timestamp basis and MONTH interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = getIntervalStartDate({
      interval: RRResetInterval.MONTH,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-01T00:00:00Z"));
  });

  it("should get correct interval start time with created at timestamp basis and DAY interval", () => {
    const result = getIntervalStartDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    });
    expect(result).toEqual(new Date("2021-06-20T00:00:00Z")); // Based on the mocked system time
  });

  it("should get correct interval start time with created at timestamp basis and MONTH interval", () => {
    const result = getIntervalStartDate({
      interval: RRResetInterval.MONTH,
      rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    });
    expect(result).toEqual(new Date("2021-06-01T00:00:00Z")); // Based on the mocked system time
  });

  it("should get correct interval end time with meeting started timestamp basis and DAY interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = getIntervalEndDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-15T23:59:59.999Z"));
  });

  it("should get correct interval end time with meeting started timestamp basis and MONTH interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = getIntervalEndDate({
      interval: RRResetInterval.MONTH,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-31T23:59:59.999Z"));
  });

  it("should get correct interval end time with created at timestamp basis", () => {
    const result = getIntervalEndDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    });
    expect(result).toEqual(new Date("2021-06-20T11:59:59Z")); // Based on the mocked system time
  });
});

it("returns the single user correctly without fetching data when only one user available", async () => {
  const singleUser = buildUser({
    id: 42,
    username: "singleuser",
    name: "Single User",
    email: "singleuser@example.com",
    bookings: [],
  });

  // Create spies to verify no data fetching occurs
  const spyCalendar = vi.spyOn(CalendarManagerMock, "getBusyCalendarTimes");
  const spyPrismaUser = vi.spyOn(prismaMock.user, "findMany");
  const spyPrismaHost = vi.spyOn(prismaMock.host, "findMany");
  const spyPrismaBooking = vi.spyOn(prismaMock.booking, "findMany");
  const spyPrismaOOO = vi.spyOn(prismaMock.outOfOfficeEntry, "findMany");

  await expect(
    luckyUserService.getLuckyUser({
      availableUsers: [singleUser],
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        includeNoShowInRRCalculation: false,
      },
      allRRHosts: [],
      routingFormResponse: null,
    })
  ).resolves.toStrictEqual(singleUser);

  // Verify no expensive operations were called
  expect(spyCalendar).not.toHaveBeenCalled();
  expect(spyPrismaUser).not.toHaveBeenCalled();
  expect(spyPrismaHost).not.toHaveBeenCalled();
  expect(spyPrismaBooking).not.toHaveBeenCalled();
  expect(spyPrismaOOO).not.toHaveBeenCalled();
});
