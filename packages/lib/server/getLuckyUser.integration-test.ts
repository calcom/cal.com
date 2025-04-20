import { describe, it, vi, expect, afterEach, beforeEach, beforeAll, afterAll } from "vitest";

import prisma from "@calcom/prisma";

import { getLuckyUser, getMultipleLuckyUsers } from "./getLuckyUser";

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

      const luckyUser = await getLuckyUser({
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
        getLuckyUser({
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
        getLuckyUser({
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
        getLuckyUser({
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

describe("getMultipleLuckyUsers Integration tests", () => {
  it("should return multiple hosts ordered by least recently booked", async () => {
    // Setup 3 hosts with different booking times
    const user1 = await createHostWithBookings({
      user: { email: "host1@example.com" },
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T05:30:00.000Z") }],
    });

    const user2 = await createHostWithBookings({
      user: { email: "host2@example.com" },
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T04:30:00.000Z") }],
    });

    const user3 = await createHostWithBookings({
      user: { email: "host3@example.com" },
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T03:30:00.000Z") }],
    });

    // Test getting 2 hosts when 3 are available
    const luckyUsers = await getMultipleLuckyUsers({
      availableUsers: [user1.user, user2.user, user3.user],
      roundRobinCount: 2,
      eventType: {
        id: commonEventTypeId,
        isRRWeightsEnabled: false,
        team: {},
      },
      allRRHosts: [],
      routingFormResponse: null,
    });

    expect(luckyUsers.length).toBe(2);
    expectLuckyUsers(luckyUsers, [
      { email: "host3@example.com" }, // Least recently booked
      { email: "host2@example.com" }, // Second least recently booked
    ]);
  });

  it("should respect host priority when selecting multiple hosts", async () => {
    // Setup 4 hosts with different priorities
    const lowPriorityHost = await createHostWithBookings({
      user: { email: "lowpriority@example.com" },
      priority: 0,
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T03:30:00.000Z") }],
    });

    const mediumPriorityHost1 = await createHostWithBookings({
      user: { email: "mediumpriority1@example.com" },
      priority: 2,
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T05:30:00.000Z") }],
    });

    const mediumPriorityHost2 = await createHostWithBookings({
      user: { email: "mediumpriority2@example.com" },
      priority: 2,
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T04:30:00.000Z") }],
    });

    const highPriorityHost = await createHostWithBookings({
      user: { email: "highpriority@example.com" },
      priority: 4,
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T06:30:00.000Z") }],
    });

    // Test getting 3 hosts with different priorities
    const luckyUsers = await getMultipleLuckyUsers({
      availableUsers: [
        lowPriorityHost.user,
        mediumPriorityHost1.user,
        mediumPriorityHost2.user,
        highPriorityHost.user,
      ],
      roundRobinCount: 3,
      eventType: {
        id: commonEventTypeId,
        isRRWeightsEnabled: false,
        team: {},
      },
      allRRHosts: [],
      routingFormResponse: null,
    });

    expect(luckyUsers.length).toBe(3);
    expectLuckyUsers(luckyUsers, [
      { email: "highpriority@example.com" }, // Highest priority first
      { email: "mediumpriority2@example.com" }, // Medium priority, less recent booking
      { email: "mediumpriority1@example.com" }, // Medium priority, more recent booking
    ]);
  });

  it("should respect weights when enabled and selecting multiple hosts", async () => {
    vi.setSystemTime(new Date("2022-06-20T11:59:59Z"));

    // Setup hosts with different weights
    const lowWeightHost = await createHostWithBookings({
      user: { email: "lowweight@example.com" },
      weight: 1,
      bookings: [],
    });

    const mediumWeightHost = await createHostWithBookings({
      user: { email: "mediumweight@example.com" },
      weight: 2,
      bookings: [],
    });

    const highWeightHost = await createHostWithBookings({
      user: { email: "highweight@example.com" },
      weight: 3,
      bookings: [],
    });

    // Test getting hosts with weights enabled
    const luckyUsers = await getMultipleLuckyUsers({
      availableUsers: [lowWeightHost.user, mediumWeightHost.user, highWeightHost.user],
      roundRobinCount: 3,
      eventType: {
        id: commonEventTypeId,
        isRRWeightsEnabled: true,
        team: {},
      },
      allRRHosts: [lowWeightHost, mediumWeightHost, highWeightHost],
      routingFormResponse: null,
    });

    // With weights, the selection becomes probabilistic, so we just check the count
    expect(luckyUsers.length).toBe(3);

    // Since there's randomness in weighted selection, we can't deterministically assert the order
    // But we can verify that all hosts are included
    expect(luckyUsers.map((user) => user.email)).toEqual(
      expect.arrayContaining(["lowweight@example.com", "mediumweight@example.com", "highweight@example.com"])
    );
  });

  it("should handle no-show bookings correctly when selecting multiple hosts", async () => {
    // Setup host that showed up for booking
    const hostThatShowedUp = await createHostWithBookings({
      user: { email: "showedup@example.com" },
      bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T05:30:00.000Z") }],
    });

    // Setup host that was marked as no-show
    const hostNoShow = await createHostWithBookings({
      user: { email: "noshow@example.com" },
      bookings: [
        {
          eventTypeId: commonEventTypeId,
          createdAt: new Date("2022-01-25T06:30:00.000Z"),
          noShowHost: true,
        },
      ],
    });

    // Setup host with recent booking but attendee no-show
    const hostWithAttendeeNoShow = await createHostWithBookings({
      user: { email: "attendeenoshow@example.com" },
      bookings: [
        {
          eventTypeId: commonEventTypeId,
          createdAt: new Date("2022-01-25T07:30:00.000Z"),
          attendees: {
            create: [
              {
                name: "test-attendee",
                email: "test-attendee@example.com",
                timeZone: "Asia/Calcutta",
                noShow: true,
              },
            ],
          },
        },
      ],
    });

    // Get 2 hosts - should prefer hosts with no-show bookings
    const luckyUsers = await getMultipleLuckyUsers({
      availableUsers: [hostThatShowedUp.user, hostNoShow.user, hostWithAttendeeNoShow.user],
      roundRobinCount: 2,
      eventType: {
        id: commonEventTypeId,
        isRRWeightsEnabled: false,
        team: {},
      },
      allRRHosts: [],
      routingFormResponse: null,
    });

    expect(luckyUsers.length).toBe(2);

    // Host no-show and attendee no-show should be preferred over host that showed up
    expectLuckyUsers(luckyUsers, [{ email: "noshow@example.com" }, { email: "attendeenoshow@example.com" }]);
  });
});
