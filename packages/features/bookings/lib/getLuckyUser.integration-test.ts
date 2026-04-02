import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import prisma from "@calcom/prisma";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const luckyUserService = getLuckyUserService();
let commonEventTypeId: number;
const userIds: number[] = [];

async function deleteUsers() {
  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
  userIds.splice(0, userIds.length);
}

beforeAll(async () => {
  const event = await prisma.eventType.create({
    data: {
      title: "Test Event",
      slug: "test-event",
      length: 15,
    },
    select: {
      id: true,
    },
  });
  commonEventTypeId = event.id;
});

beforeEach(() => {
  // tell vitest we use mocked time
  vi.useFakeTimers();
});

afterEach(async () => {
  await deleteUsers();
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.eventType.delete({
    where: {
      id: commonEventTypeId,
    },
  });
});

type BookingPropsRelatedToLuckyUserAlgorithm = {
  eventTypeId: number;
  createdAt: Date;
  noShowHost?: boolean | null;
};

type OptionalBookingProps = {
  uid?: string;
  title?: string;
  startTime?: Date;
  endTime?: Date;
  attendees?: {
    create: {
      name: string;
      email: string;
      timeZone: string;
      noShow?: boolean | null;
    }[];
  };
};

type UserProps = {
  email: string;
  createdDate?: Date;
};

const commonBookingData = {
  startTime: new Date(),
  endTime: new Date(),
};

const commonAttendeesData = [
  {
    name: "test-attendee",
    email: "test-attendee@example.com",
    timeZone: "Asia/Calcutta",
  },
];

const createUserWithBookings = async ({
  user: { email, createdDate },
  bookings,
}: {
  user: UserProps;
  bookings: (BookingPropsRelatedToLuckyUserAlgorithm & OptionalBookingProps)[];
}) => {
  const user = await prisma.user.create({
    data: {
      email,
      createdDate,
      bookings: {
        create: bookings.map(({ eventTypeId, ...booking }, index) => ({
          ...commonBookingData,
          attendees: {
            create: commonAttendeesData,
          },
          uid: `uuid-${email}-booking${index + 1}`,
          title: `${email} Booking ${index + 1}`,
          eventTypeId,
          ...booking,
        })),
      },
    },
    include: {
      bookings: true,
      credentials: true,
    },
  });
  userIds.push(user.id);
  return user;
};

const createHostWithBookings = async ({
  user: userData,
  bookings,
  priority = 2,
  weight = null,
  createdAt,
}: {
  user: UserProps;
  bookings: (BookingPropsRelatedToLuckyUserAlgorithm & OptionalBookingProps)[];
  weight?: number | null;
  priority?: number;
  createdAt?: Date;
}) => {
  const user = await createUserWithBookings({
    user: {
      createdDate: userData.createdDate || new Date(),
      email: userData.email,
    },
    bookings,
  });

  const host = await prisma.host.create({
    data: {
      user: { connect: { id: user.id } },
      eventType: { connect: { id: commonEventTypeId } },
      weight,
      priority,
      createdAt: createdAt ?? new Date(),
    },
    include: {
      user: {
        include: {
          bookings: true,
          credentials: true,
        },
      },
    },
  });
  return {
    ...host,
    user: {
      ...host.user,
      priority,
      weight,
    },
  };
};

function expectLuckyUsers(luckyUsers: { email: string }[], expectedLuckyUsers: { email: string }[]) {
  expect(luckyUsers.map((user) => user.email)).toEqual(expectedLuckyUsers.map((user) => user.email));
}

describe("getLuckyUser Integration tests", () => {
  describe("should not consider no show bookings for round robin: ", () => {
    it("When a host is no show, that is chosen when competing with another host that showed up for the booking", async () => {
      const createOrganizerThatShowedUp = async (email: string) => {
        return createHostWithBookings({
          user: { email },
          bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T05:30:00.000Z") }],
        });
      };

      const createOrganizerThatDidntShowUp = async (email: string) => {
        return createHostWithBookings({
          user: { email },
          bookings: [
            {
              eventTypeId: commonEventTypeId,
              createdAt: new Date("2022-01-25T06:30:00.000Z"),
              noShowHost: true,
            },
          ],
        });
      };

      const organizerHostThatShowedUp = await createOrganizerThatShowedUp("test-user1@example.com");
      const organizerHostThatDidntShowUp = await createOrganizerThatDidntShowUp("test-user2@example.com");
      const organizerThatShowedUp = organizerHostThatShowedUp.user;
      const organizerThatDidntShowUp = organizerHostThatDidntShowUp.user;

      const luckyUser = await luckyUserService.getLuckyUser({
        availableUsers: [organizerThatShowedUp, organizerThatDidntShowUp],
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled: false,
          team: {},
        },
        allRRHosts: [],
        routingFormResponse: null,
      });

      expect(luckyUser.email).toBe(organizerThatDidntShowUp.email);
    });

    it("When a attendee is a noShow for organizers booking, that organizer is competing with another host whose attendee showed up for the booking", async () => {
      const organizerHostWhoseAttendeeShowedUp = await createHostWithBookings({
        user: { email: "test-user1@example.com" },
        bookings: [
          {
            eventTypeId: commonEventTypeId,
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
            title: "Test User 1 Booking",
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
          },
        ],
      });

      const organizerWhoseAttendeeShowedUp = organizerHostWhoseAttendeeShowedUp.user;

      const organizerHostWhoseAttendeeDidntShowUp = await createHostWithBookings({
        user: { email: "test-user2@example.com" },
        bookings: [
          {
            eventTypeId: commonEventTypeId,
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
            attendees: {
              create: [
                {
                  noShow: true,
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
          },
        ],
      });

      const organizerWhoseAttendeeDidntShowUp = organizerHostWhoseAttendeeDidntShowUp.user;

      expect(
        luckyUserService.getLuckyUser({
          availableUsers: [organizerWhoseAttendeeShowedUp, organizerWhoseAttendeeDidntShowUp],
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: false,
            team: {},
          },
          allRRHosts: [],
          routingFormResponse: null,
        })
      ).resolves.toStrictEqual(organizerWhoseAttendeeDidntShowUp);
    });

    it("When a organizer is attendee (event types with fixed hosts) and no show, that organizer is competing other hosts", async () => {
      const organizerHostWhoseAttendeeShowedUp = await createHostWithBookings({
        user: { email: "test-user1@example.com" },
        bookings: [
          {
            eventTypeId: commonEventTypeId,
            createdAt: new Date("2022-01-25T05:30:00.000Z"),
            title: "Test User 1 Booking",
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
          },
        ],
      });
      const organizerWhoseAttendeeShowedUp = organizerHostWhoseAttendeeShowedUp.user;

      const fixedHostOrganizerHostWhoseAttendeeDidNotShowUp = await createHostWithBookings({
        user: { email: "test-user2@example.com" },
        bookings: [
          {
            eventTypeId: commonEventTypeId,
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
          },
          // User2 is fixed user, User 3 was selected as round robin host but did not show up so this booking should be counted for User 3
          {
            uid: "uuid-test-user2-booking2",
            title: `Test User 2 Booking 2`,
            createdAt: new Date("2022-01-25T07:30:00.000Z"),
            eventTypeId: commonEventTypeId,
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-user3@example.com",
                  timeZone: "Asia/Calcutta",
                  noShow: true,
                },
              ],
            },
          },
        ],
      });
      const fixedHostOrganizerWhoseAttendeeDidNotShowUp =
        fixedHostOrganizerHostWhoseAttendeeDidNotShowUp.user;

      const organizerHostWhoWasAttendeeAndDidntShowUp = await createHostWithBookings({
        user: { email: `test-user3@example.com` },
        bookings: [
          {
            uid: "uuid-test-user3-booking1",
            title: `Test User 3 Booking`,
            createdAt: new Date("2022-01-25T04:30:00.000Z"),
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
            eventTypeId: commonEventTypeId,
          },
        ],
      });

      const organizerWhoWasAttendeeAndDidntShowUp = organizerHostWhoWasAttendeeAndDidntShowUp.user;

      expect(
        luckyUserService.getLuckyUser({
          availableUsers: [
            organizerWhoseAttendeeShowedUp,
            fixedHostOrganizerWhoseAttendeeDidNotShowUp,
            organizerWhoWasAttendeeAndDidntShowUp,
          ],
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: false,
            team: {},
          },
          allRRHosts: [],
          routingFormResponse: null,
        })
      ).resolves.toStrictEqual(organizerWhoWasAttendeeAndDidntShowUp);
    });

    it("should consider booking when noShowHost is null", async () => {
      const hostWithBookingThatHappenedLater = await createHostWithBookings({
        user: { email: "test-user1@example.com" },
        bookings: [
          {
            uid: "uuid-test-user1-booking1",
            createdAt: new Date("2022-01-25T07:30:00.000Z"),
            title: "Test user 1 Booking",
            noShowHost: null,
            eventTypeId: commonEventTypeId,
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
          },
        ],
      });

      const userWithBookingThatHappenedLater = hostWithBookingThatHappenedLater.user;

      const hostWithBookingThatHappenedEarlier = await createHostWithBookings({
        user: { email: "test-user2@example.com" },
        bookings: [
          {
            uid: "uuid-test-user2-booking1",
            title: "Test User 2 Booking",
            createdAt: new Date("2022-01-25T06:30:00.000Z"),
            noShowHost: null,
            eventTypeId: commonEventTypeId,
            attendees: {
              create: [
                {
                  name: "test-attendee",
                  email: "test-attendee@example.com",
                  timeZone: "Asia/Calcutta",
                },
              ],
            },
          },
        ],
      });

      const userWithBookingThatHappenedEarlier = hostWithBookingThatHappenedEarlier.user;

      expect(
        luckyUserService.getLuckyUser({
          availableUsers: [userWithBookingThatHappenedLater, userWithBookingThatHappenedEarlier],
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: false,
            team: {},
          },
          allRRHosts: [],
          routingFormResponse: null,
        })
      ).resolves.toStrictEqual(userWithBookingThatHappenedEarlier);
    });
  });
});

describe("getOrderedListOfLuckyUsers Integration tests", () => {
  beforeEach(() => {
    vi.setSystemTime("2024-11-14T00:00:13Z");
  });

  it("should sort as per availableUsers if no other criteria like weight/priority/calibration (TODO: make it independent of availableUsers order)", async () => {
    const [host1, host2, host3] = await Promise.all([
      createHostWithBookings({
        user: { email: "test-user1@example.com" },
        bookings: [],
        createdAt: new Date(),
      }),
      createHostWithBookings({
        user: { email: "test-user2@example.com" },
        bookings: [],
        createdAt: new Date(),
      }),
      createHostWithBookings({
        user: { email: "test-user3@example.com" },
        bookings: [],
        createdAt: new Date(),
      }),
    ]);

    const user1 = host1.user;
    const user2 = host2.user;
    const user3 = host3.user;

    const { users: luckyUsers } = await luckyUserService.getOrderedListOfLuckyUsers({
      availableUsers: [user2, user1, user3],
      eventType: {
        id: commonEventTypeId,
        isRRWeightsEnabled: false,
        team: {},
      },
      allRRHosts: [],
      routingFormResponse: null,
    });

    expectLuckyUsers(luckyUsers, [user2, user1, user3]);

    const { users: luckyUsers2 } = await luckyUserService.getOrderedListOfLuckyUsers({
      availableUsers: [user3, user1, user2],
      eventType: {
        id: commonEventTypeId,
        isRRWeightsEnabled: false,
        team: {},
      },
      allRRHosts: [],
      routingFormResponse: null,
    });
    expectLuckyUsers(luckyUsers2, [user3, user1, user2]);
  });

  describe("should sort as per weights", () => {
    const isRRWeightsEnabled = true;
    it("even if there are no bookings", async () => {
      const [host1WithWeight100, host2WithWeight200, host3WithWeight100] = await Promise.all([
        createHostWithBookings({
          user: { email: "test-user1@example.com" },
          bookings: [],
          createdAt: new Date(),
          weight: 100,
        }),
        createHostWithBookings({
          user: { email: "test-user2@example.com" },
          bookings: [],
          createdAt: new Date(),
          weight: 200,
        }),
        createHostWithBookings({
          user: { email: "test-user3@example.com" },
          bookings: [],
          createdAt: new Date(),
          weight: 100,
        }),
      ]);

      const user1WithWeight100 = host1WithWeight100.user;
      const userWithHighestWeight = host2WithWeight200.user;
      const user2WithWeight100 = host3WithWeight100.user;

      const allRRHosts = [host1WithWeight100, host2WithWeight200, host3WithWeight100];
      const { users: luckyUsers } = await luckyUserService.getOrderedListOfLuckyUsers({
        availableUsers: [userWithHighestWeight, user1WithWeight100, user2WithWeight100],
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled,
          team: {},
        },
        allRRHosts,
        routingFormResponse: null,
      });

      expectLuckyUsers(luckyUsers, [
        // It has the highest weight
        userWithHighestWeight,
        // It has the same weight as the next one but comes earlier in availableUsers array
        user1WithWeight100,
        // It is the last choice
        user2WithWeight100,
      ]);

      const { users: luckyUsers2 } = await luckyUserService.getOrderedListOfLuckyUsers({
        availableUsers: [user2WithWeight100, userWithHighestWeight, user1WithWeight100],
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled,
          team: {},
        },
        allRRHosts,
        routingFormResponse: null,
      });
      expectLuckyUsers(luckyUsers2, [
        // It has the highest weight and zero bookings.
        userWithHighestWeight,
        // It has the same weight as the next one but comes earlier in availableUsers array
        user2WithWeight100,
        // It is the last choice
        user1WithWeight100,
      ]);
    });

    it("consider booking count for the current month", async () => {
      const [
        hostWithOneBookingAndWeight200,
        hostWithTwoBookingsAndWeight100,
        hostWithThreeBookingsAndWeight100,
      ] = await Promise.all([
        createHostWithBookings({
          user: { email: "test-user1@example.com" },
          bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date() }],
          createdAt: new Date(),
          weight: 200,
        }),
        createHostWithBookings({
          user: { email: "test-user2@example.com" },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date() },
            { eventTypeId: commonEventTypeId, createdAt: new Date() },
          ],
          createdAt: new Date(),
          weight: 100,
        }),
        createHostWithBookings({
          user: { email: "test-user3@example.com" },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date() },
            { eventTypeId: commonEventTypeId, createdAt: new Date() },
            { eventTypeId: commonEventTypeId, createdAt: new Date() },
          ],
          createdAt: new Date(),
          weight: 100,
        }),
      ]);

      const userWithOneBookingAndWeight200 = hostWithOneBookingAndWeight200.user;
      const userWithTwoBookingsAndWeight100 = hostWithTwoBookingsAndWeight100.user;
      const userWithThreeBookingsAndWeight100 = hostWithThreeBookingsAndWeight100.user;

      const availableUsers = [
        userWithThreeBookingsAndWeight100,
        userWithTwoBookingsAndWeight100,
        userWithOneBookingAndWeight200,
      ];

      const getLuckUserParams = {
        availableUsers,
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled,
          team: null,
        },
        allRRHosts: [
          hostWithOneBookingAndWeight200,
          hostWithTwoBookingsAndWeight100,
          hostWithThreeBookingsAndWeight100,
        ],
        routingFormResponse: null,
      };

      const { users: luckyUsers, perUserData } = await luckyUserService.getOrderedListOfLuckyUsers({
        ...getLuckUserParams,
        availableUsers: [getLuckUserParams.availableUsers[0], ...getLuckUserParams.availableUsers.slice(1)],
      });

      expectLuckyUsers(luckyUsers, [
        // User with 1 booking is chosen first because it has higher weight and lesser bookings
        userWithOneBookingAndWeight200,
        // User with 2 bookings is chosen next because it has lesser bookings
        userWithTwoBookingsAndWeight100,
        // User with 3 bookings is chosen last because it has the most bookings
        userWithThreeBookingsAndWeight100,
      ]);

      if (!perUserData?.bookingShortfalls) {
        throw new Error("bookingShortfalls is not defined");
      }
      expect(perUserData.bookingShortfalls[userWithThreeBookingsAndWeight100.id]).toBe(-1.5);
      expect(perUserData.bookingShortfalls[userWithTwoBookingsAndWeight100.id]).toBe(-0.5);
      expect(perUserData.bookingShortfalls[userWithOneBookingAndWeight200.id]).toBe(2);
    });

    it("not considering bookings that were created in previous months", async () => {
      const [
        hostWithOneBookingInPreviousMonthAndWeight200,
        hostWithTwoBookingsInPreviousMonthAndWeight100,
        hostWithThreeBookingsInPreviousMonthAndWeight100,
      ] = await Promise.all([
        createHostWithBookings({
          user: { email: "test-user1@example.com", createdDate: new Date() },
          bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2024-10-01T00:00:00.000Z") }],
          weight: 200,
          createdAt: new Date(),
        }),
        createHostWithBookings({
          user: { email: "test-user2@example.com", createdDate: new Date() },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date("2024-10-01T00:00:00.000Z") },
            { eventTypeId: commonEventTypeId, createdAt: new Date("2024-10-01T00:00:00.000Z") },
          ],
          weight: 100,
          createdAt: new Date(),
        }),
        createHostWithBookings({
          user: { email: "test-user3@example.com", createdDate: new Date() },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date("2024-10-01T00:00:00.000Z") },
            { eventTypeId: commonEventTypeId, createdAt: new Date("2024-10-01T00:00:00.000Z") },
            { eventTypeId: commonEventTypeId, createdAt: new Date("2024-10-01T00:00:00.000Z") },
          ],
          weight: 100,
          createdAt: new Date(),
        }),
      ]);

      const userWithOneBookingInPreviousMonthAndWeight200 =
        hostWithOneBookingInPreviousMonthAndWeight200.user;
      const userWithTwoBookingsInPreviousMonthAndWeight100 =
        hostWithTwoBookingsInPreviousMonthAndWeight100.user;
      const userWithThreeBookingsInPreviousMonthAndWeight100 =
        hostWithThreeBookingsInPreviousMonthAndWeight100.user;

      const availableUsers = [
        userWithThreeBookingsInPreviousMonthAndWeight100,
        userWithTwoBookingsInPreviousMonthAndWeight100,
        userWithOneBookingInPreviousMonthAndWeight200,
      ];

      const getLuckUserParams = {
        availableUsers,
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled,
          team: null,
        },
        allRRHosts: [
          hostWithOneBookingInPreviousMonthAndWeight200,
          hostWithTwoBookingsInPreviousMonthAndWeight100,
          hostWithThreeBookingsInPreviousMonthAndWeight100,
        ],
        routingFormResponse: null,
      };

      const { users: luckyUsers, perUserData } = await luckyUserService.getOrderedListOfLuckyUsers({
        ...getLuckUserParams,
        availableUsers: [getLuckUserParams.availableUsers[0], ...getLuckUserParams.availableUsers.slice(1)],
      });

      expectLuckyUsers(luckyUsers, [
        // User with 1 booking is chosen first because it has higher weight and lesser bookings
        userWithOneBookingInPreviousMonthAndWeight200,
        // User with 3 bookings is chosen next because it comes earlier in availableUsers array
        userWithThreeBookingsInPreviousMonthAndWeight100,
        // User with 2 bookings is chosen last because it comes later in availableUsers array
        userWithTwoBookingsInPreviousMonthAndWeight100,
      ]);

      if (!perUserData?.bookingShortfalls) {
        throw new Error("bookingShortfalls is not defined");
      }

      // Because no one has any bookings in the current month, the booking shortfall should be 0 for all users
      expect(perUserData.bookingShortfalls[userWithThreeBookingsInPreviousMonthAndWeight100.id]).toBe(0);
      expect(perUserData.bookingShortfalls[userWithTwoBookingsInPreviousMonthAndWeight100.id]).toBe(0);
      expect(perUserData.bookingShortfalls[userWithOneBookingInPreviousMonthAndWeight200.id]).toBe(0);
    });
  });
  describe("should sort as per host creation data calibration", () => {
    const isRRWeightsEnabled = true;

    it("not considering bookings that were created in previous months", async () => {
      const today = new Date();
      const tenthOfTheMonth = new Date(today.getFullYear(), today.getMonth(), 10);
      const secondsInDay = 24 * 60 * 60 * 1000;
      const ninthOfTheMonth = new Date(tenthOfTheMonth.getTime() - secondsInDay);
      const eighthOfTheMonth = new Date(tenthOfTheMonth.getTime() - 2 * secondsInDay);
      const [host1, host2, host3] = await Promise.all([
        createHostWithBookings({
          user: { email: "test-user1@example.com", createdDate: tenthOfTheMonth },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date(tenthOfTheMonth.getTime() + 1000) },
          ],
          weight: 200,
          createdAt: tenthOfTheMonth,
        }),
        createHostWithBookings({
          user: { email: "test-user2@example.com", createdDate: ninthOfTheMonth },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date(ninthOfTheMonth.getTime() + 1000) },
            { eventTypeId: commonEventTypeId, createdAt: new Date(ninthOfTheMonth.getTime() + 2000) },
          ],
          weight: 100,
          createdAt: ninthOfTheMonth,
        }),
        createHostWithBookings({
          user: { email: "test-user3@example.com", createdDate: eighthOfTheMonth },
          bookings: [
            { eventTypeId: commonEventTypeId, createdAt: new Date(eighthOfTheMonth.getTime() + 1000) },
            { eventTypeId: commonEventTypeId, createdAt: new Date(eighthOfTheMonth.getTime() + 2000) },
            { eventTypeId: commonEventTypeId, createdAt: new Date(eighthOfTheMonth.getTime() + 3000) },
          ],
          weight: 100,
          createdAt: eighthOfTheMonth,
        }),
      ]);

      const availableUsers = [host3.user, host2.user, host1.user];

      const getLuckyUserParams = {
        availableUsers,
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled,
          team: null,
        },
        allRRHosts: [host1, host2, host3],
        routingFormResponse: null,
      };

      const { users: luckyUsers, perUserData } = await luckyUserService.getOrderedListOfLuckyUsers({
        ...getLuckyUserParams,
        availableUsers: [getLuckyUserParams.availableUsers[0], ...getLuckyUserParams.availableUsers.slice(1)],
      });

      if (!perUserData?.bookingShortfalls || !perUserData?.calibrations) {
        throw new Error("bookingShortfalls or calibrations is not defined");
      }

      expect(perUserData.calibrations[host1.user.id]).toBe(2.5);
      expect(perUserData.calibrations[host2.user.id]).toBe(3);
      expect(perUserData.calibrations[host3.user.id]).toBe(0);

      expectLuckyUsers(luckyUsers, [host1.user, host3.user, host2.user]);
    });
  });
});
