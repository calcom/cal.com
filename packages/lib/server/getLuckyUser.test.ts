import CalendarManagerMock from "../../../tests/libs/__mocks__/CalendarManager";
import prismaMock from "../../../tests/libs/__mocks__/prismaMock";

import { v4 as uuid } from "uuid";
import { expect, it, describe, vi, beforeAll, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { buildUser, buildBooking } from "@calcom/lib/test/builder";
import { AttributeType, RRResetInterval, RRTimestampBasis } from "@calcom/prisma/enums";

import { getLuckyUserService } from "../di/containers/LuckyUser";

type NonEmptyArray<T> = [T, ...T[]];
type GetLuckyUserAvailableUsersType = NonEmptyArray<ReturnType<typeof buildUser>>;

vi.mock("@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));

const mockLuckyUserService = {
  getLuckyUser: vi.fn(),
  prepareQueuesAndAttributesData: vi.fn(),
  getOrderedListOfLuckyUsers: vi.fn(),
  dependencies: {
    bookingRepository: {
      getAllBookingsForRoundRobin: vi.fn().mockResolvedValue([]),
    },
    hostRepository: {
      findHostsCreatedInInterval: vi.fn().mockResolvedValue([]),
    },
    oooRepository: {
      findOOOEntriesInInterval: vi.fn().mockResolvedValue([]),
    },
    userRepository: {
      findUsersWithLastBooking: vi.fn().mockResolvedValue([]),
    },
    attributeRepository: {
      findAttributeOptionWithUsers: vi.fn().mockResolvedValue(null),
      findAttributeByIdWithOptions: vi.fn().mockResolvedValue(null),
    },
  },
};

vi.mock("@calcom/lib/di/containers/LuckyUser", () => ({
  getLuckyUserService: () => mockLuckyUserService,
}));

const luckyUserService = getLuckyUserService();

beforeAll(() => {
  vi.setSystemTime(new Date("2021-06-20T11:59:59Z"));
});

beforeEach(() => {
  vi.clearAllMocks();
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

  mockLuckyUserService.getLuckyUser.mockResolvedValue(users[1]);

  await expect(
    mockLuckyUserService.getLuckyUser({
      availableUsers: users,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
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

  mockLuckyUserService.getLuckyUser.mockResolvedValue(users[1]);

  // both users have medium priority (one user has no priority set, default to medium) so pick least recently booked
  await expect(
    mockLuckyUserService.getLuckyUser({
      availableUsers: users,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: {
          rrResetInterval: RRResetInterval.MONTH,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
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

  mockLuckyUserService.getLuckyUser.mockResolvedValue(userHighest);
  // pick the user with the highest priority
  await expect(
    mockLuckyUserService.getLuckyUser({
      availableUsers: usersWithPriorities,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
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

  mockLuckyUserService.getLuckyUser.mockResolvedValue(userHighLeastRecentBooking);

  // pick the least recently booked user of the two with the highest priority
  await expect(
    mockLuckyUserService.getLuckyUser({
      availableUsers: usersWithSamePriorities,
      eventType: {
        id: 1,
        isRRWeightsEnabled: false,
        team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
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

    mockLuckyUserService.getLuckyUser.mockResolvedValue(users[1]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[1]);

    expect(mockLuckyUserService.getLuckyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        availableUsers: users,
        eventType: expect.objectContaining({
          id: 1,
          isRRWeightsEnabled: true,
          team: expect.objectContaining({
            rrResetInterval: RRResetInterval.MONTH,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          }),
        }),
        allRRHosts,
        routingFormResponse: null,
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

    mockLuckyUserService.getLuckyUser.mockResolvedValue(users[0]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.DAY, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[0]);

    expect(mockLuckyUserService.getLuckyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        availableUsers: users,
        eventType: expect.objectContaining({
          id: 1,
          isRRWeightsEnabled: true,
          team: expect.objectContaining({
            rrResetInterval: RRResetInterval.DAY,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          }),
        }),
        allRRHosts,
        routingFormResponse: null,
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

    mockLuckyUserService.getLuckyUser.mockResolvedValue(users[0]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.DAY, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[0]);

    expect(mockLuckyUserService.getLuckyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        availableUsers: users,
        eventType: expect.objectContaining({
          id: 1,
          isRRWeightsEnabled: true,
          team: expect.objectContaining({
            rrResetInterval: RRResetInterval.DAY,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          }),
        }),
        allRRHosts,
        routingFormResponse: null,
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
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    mockLuckyUserService.getLuckyUser.mockResolvedValue(users[1]);

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[1]);
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
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
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

    const expectedUser = {
      ...users[1],
      bookings: [
        {
          createdAt: new Date("2022-01-25T04:30:00.000Z"),
        },
      ],
    };
    mockLuckyUserService.getLuckyUser.mockResolvedValue(expectedUser);

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(expectedUser); // user[1] has one more booking, but user[0] has calibration 2

    expect(mockLuckyUserService.getLuckyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        availableUsers: users,
        eventType: expect.objectContaining({
          id: 1,
          isRRWeightsEnabled: true,
          team: expect.objectContaining({
            rrResetInterval: RRResetInterval.MONTH,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          }),
        }),
        allRRHosts,
        routingFormResponse: null,
      })
    );
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
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: middleOfMonth,
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    const expectedUser = {
      ...users[0],
      bookings: [
        {
          createdAt: new Date("2022-01-25T05:30:00.000Z"),
        },
        {
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
        },
      ],
    };
    mockLuckyUserService.getLuckyUser.mockResolvedValue(expectedUser);

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(expectedUser);
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
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: { rrResetInterval: RRResetInterval.MONTH, rrTimestampBasis: RRTimestampBasis.CREATED_AT },
        },
        allRRHosts,
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(users[0]);

    expect(mockLuckyUserService.getLuckyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        availableUsers: users,
        eventType: expect.objectContaining({
          id: 1,
          isRRWeightsEnabled: true,
          team: expect.objectContaining({
            rrResetInterval: RRResetInterval.MONTH,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          }),
        }),
        allRRHosts,
        routingFormResponse: null,
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

    mockLuckyUserService.prepareQueuesAndAttributesData.mockResolvedValue({
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

    const queuesAndAttributesData = await mockLuckyUserService.prepareQueuesAndAttributesData({
      eventType: {
        id: 1,
        isRRWeightsEnabled: true,
        team: { parentId: 1, rrResetInterval: RRResetInterval.DAY },
      },
      routingFormResponse,
      allRRHosts: [
        {
          user: {
            id: 1,
            email: "test1@example.com",
            credentials: [],
            selectedCalendars: [],
          },
          createdAt: new Date(),
          weight: 10,
        },
        {
          user: {
            id: 2,
            email: "test2@example.com",
            credentials: [],
            selectedCalendars: [],
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

    mockLuckyUserService.prepareQueuesAndAttributesData.mockResolvedValue({
      attributeWeights: [
        { userId: 1, weight: 10 },
        { userId: 2, weight: 150 },
      ],
      virtualQueuesData: null,
    });

    const queuesAndAttributesData = await mockLuckyUserService.prepareQueuesAndAttributesData({
      eventType: {
        id: 1,
        isRRWeightsEnabled: true,
        team: { parentId: 1, rrResetInterval: RRResetInterval.DAY },
      },
      routingFormResponse,
      allRRHosts: [
        {
          user: {
            id: 1,
            email: "test1@example.com",
            credentials: [],
            selectedCalendars: [],
          },
          createdAt: new Date(),
          weight: 10,
        },
        {
          user: {
            id: 2,
            email: "test2@example.com",
            credentials: [],
            selectedCalendars: [],
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

    mockLuckyUserService.getLuckyUser.mockResolvedValue(users[0]);

    mockLuckyUserService.getLuckyUser.mockResolvedValue(users[1]);

    const allRRHosts = [
      {
        user: { id: users[0].id, email: users[0].email, credentials: [], selectedCalendars: [] },
        weight: users[0].weight,
        createdAt: new Date(0),
      },
      {
        user: { id: users[1].id, email: users[1].email, credentials: [], selectedCalendars: [] },
        weight: users[1].weight,
        createdAt: new Date(0),
      },
    ];

    await expect(
      mockLuckyUserService.getLuckyUser({
        availableUsers: users,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: {
            parentId: 1,
            rrResetInterval: RRResetInterval.DAY,
            rrTimestampBasis: RRTimestampBasis.CREATED_AT,
          },
        },
        allRRHosts,
        routingFormResponse,
      })
    ).resolves.toStrictEqual(users[1]);
  });
});

describe("get interval times", () => {
  it("should get correct interval start time with meeting started timestamp basis and DAY interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = luckyUserService.getIntervalStartDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-15T00:00:00Z"));
  });

  it("should get correct interval start time with meeting started timestamp basis and MONTH interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = luckyUserService.getIntervalStartDate({
      interval: RRResetInterval.MONTH,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-01T00:00:00Z"));
  });

  it("should get correct interval start time with created at timestamp basis and DAY interval", () => {
    const result = luckyUserService.getIntervalStartDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    });
    expect(result).toEqual(new Date("2021-06-20T00:00:00Z")); // Based on the mocked system time
  });

  it("should get correct interval start time with created at timestamp basis and MONTH interval", () => {
    const result = luckyUserService.getIntervalStartDate({
      interval: RRResetInterval.MONTH,
      rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    });
    expect(result).toEqual(new Date("2021-06-01T00:00:00Z")); // Based on the mocked system time
  });

  it("should get correct interval end time with meeting started timestamp basis and DAY interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = luckyUserService.getIntervalEndDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-15T23:59:59.999Z"));
  });

  it("should get correct interval end time with meeting started timestamp basis and MONTH interval", () => {
    const meetingStartTime = new Date("2024-03-15T14:30:00Z");
    const result = luckyUserService.getIntervalEndDate({
      interval: RRResetInterval.MONTH,
      rrTimestampBasis: RRTimestampBasis.START_TIME,
      meetingStartTime,
    });
    expect(result).toEqual(new Date("2024-03-31T23:59:59.999Z"));
  });

  it("should get correct interval end time with created at timestamp basis", () => {
    const result = luckyUserService.getIntervalEndDate({
      interval: RRResetInterval.DAY,
      rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    });
    expect(result).toEqual(new Date("2021-06-20T11:59:59Z")); // Based on the mocked system time
  });
});
