import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";

import prisma from "@calcom/prisma";

import { DistributionMethod, getLuckyUser, getOrderedListOfLuckyUsers } from "./getLuckyUser";

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

afterEach(async () => {
  await deleteUsers();
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
  user: { email },
  bookings,
}: {
  user: UserProps;
  bookings: (BookingPropsRelatedToLuckyUserAlgorithm & OptionalBookingProps)[];
}) => {
  const user = await prisma.user.create({
    data: {
      email,
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

const createOrganizerWithBookings = async ({
  user,
  bookings,
}: {
  user: UserProps;
  bookings: (BookingPropsRelatedToLuckyUserAlgorithm & OptionalBookingProps)[];
}) => {
  return createUserWithBookings({ user, bookings });
};

describe("getLuckyUser Integration tests", () => {
  describe("should not consider no show bookings for round robin: ", () => {
    it("When a host is no show, that is chosen when competing with another host that showed up for the booking", async () => {
      const createOrganizerThatShowedUp = async (email: string) => {
        return createOrganizerWithBookings({
          user: { email },
          bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date("2022-01-25T05:30:00.000Z") }],
        });
      };

      const createOrganizerThatDidntShowUp = async (email: string) => {
        return createOrganizerWithBookings({
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

      const organizerThatShowedUp = await createOrganizerThatShowedUp("test-user1@example.com");
      const organizerThatDidntShowUp = await createOrganizerThatDidntShowUp("test-user2@example.com");
      console.log({
        organizerThatShowedUp: {
          id: organizerThatShowedUp.id,
          email: organizerThatShowedUp.email,
          bookings: JSON.stringify(organizerThatShowedUp.bookings),
        },
        organizerThatDidntShowUp: {
          id: organizerThatDidntShowUp.id,
          email: organizerThatDidntShowUp.email,
          bookings: JSON.stringify(organizerThatDidntShowUp.bookings),
        },
      });
      const luckyUser = await getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        availableUsers: [organizerThatShowedUp, organizerThatDidntShowUp],
        eventType: {
          id: commonEventTypeId,
          isRRWeightsEnabled: false,
        },
        allRRHosts: [],
      });

      expect(luckyUser.email).toBe(organizerThatDidntShowUp.email);
    });

    it("When a attendee is a noShow for organizers booking, that organizer is competing with another host whose attendee showed up for the booking", async () => {
      const organizerWhoseAttendeeShowedUp = await createOrganizerWithBookings({
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

      const organizerWhoseAttendeeDidntShowUp = await createOrganizerWithBookings({
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

      expect(
        getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
          availableUsers: [organizerWhoseAttendeeShowedUp, organizerWhoseAttendeeDidntShowUp],
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: false,
          },
          allRRHosts: [],
        })
      ).resolves.toStrictEqual(organizerWhoseAttendeeDidntShowUp);
    });

    it("When a organizer is attendee (event types with fixed hosts) and no show, that organizer is competing other hosts", async () => {
      const organizerWhoseAttendeeShowedUp = await createOrganizerWithBookings({
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

      const fixedHostOrganizerWhoseAttendeeDidNotShowUp = await createOrganizerWithBookings({
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

      const organizerWhoWasAttendeeAndDidntShowUp = await createOrganizerWithBookings({
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

      expect(
        getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
          availableUsers: [
            organizerWhoseAttendeeShowedUp,
            fixedHostOrganizerWhoseAttendeeDidNotShowUp,
            organizerWhoWasAttendeeAndDidntShowUp,
          ],
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: false,
          },
          allRRHosts: [],
        })
      ).resolves.toStrictEqual(organizerWhoWasAttendeeAndDidntShowUp);
    });

    it("should consider booking when noShowHost is null", async () => {
      const userWithBookingThatHappenedLater = await createOrganizerWithBookings({
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

      const userWithBookingThatHappenedEarlier = await createOrganizerWithBookings({
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

      expect(
        getLuckyUser(DistributionMethod.PRIORITIZE_AVAILABILITY, {
          availableUsers: [userWithBookingThatHappenedLater, userWithBookingThatHappenedEarlier],
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: false,
          },
          allRRHosts: [],
        })
      ).resolves.toStrictEqual(userWithBookingThatHappenedEarlier);
    });
  });
});

describe("getOrderedListOfLuckyUsers Integration tests", () => {
  describe("should not consider no show bookings for round robin: ", () => {
    describe("3 users with no bookings", () => {
      it("should be sorted by as provided in availableUsers if no other criteria like weight/priority/calibration (TODO: make it independent of availableUsers order)", async () => {
        const [user1, user2, user3] = await Promise.all([
          createOrganizerWithBookings({ user: { email: "test-user1@example.com" }, bookings: [] }),
          createOrganizerWithBookings({ user: { email: "test-user2@example.com" }, bookings: [] }),
          createOrganizerWithBookings({ user: { email: "test-user3@example.com" }, bookings: [] }),
        ]);

        const { users: luckyUsers } = await getOrderedListOfLuckyUsers(
          DistributionMethod.PRIORITIZE_AVAILABILITY,
          {
            availableUsers: [user2, user1, user3],
            eventType: {
              id: commonEventTypeId,
              isRRWeightsEnabled: false,
            },
            allRRHosts: [],
          }
        );

        expect(luckyUsers).toEqual([user2, user1, user3]);

        const { users: luckyUsers2 } = await getOrderedListOfLuckyUsers(
          DistributionMethod.PRIORITIZE_AVAILABILITY,
          {
            availableUsers: [user3, user1, user2],
            eventType: {
              id: commonEventTypeId,
              isRRWeightsEnabled: false,
            },
            allRRHosts: [],
          }
        );
        expect(luckyUsers2).toEqual([user3, user1, user2]);
      });

      it("should be sorted by as provided in availableUsers even if weights are enabled and different. It is because no bookings are there to prefer some particular user", async () => {
        const [user1, user2, user3] = await Promise.all([
          createOrganizerWithBookings({ user: { email: "test-user1@example.com" }, bookings: [] }),
          createOrganizerWithBookings({ user: { email: "test-user2@example.com" }, bookings: [] }),
          createOrganizerWithBookings({ user: { email: "test-user3@example.com" }, bookings: [] }),
        ]);

        const { users: luckyUsers } = await getOrderedListOfLuckyUsers(
          DistributionMethod.PRIORITIZE_AVAILABILITY,
          {
            availableUsers: [user2, user1, user3],
            eventType: {
              id: commonEventTypeId,
              isRRWeightsEnabled: true,
            },
            allRRHosts: [
              {
                user: user1,
                createdAt: new Date(),
                weight: 100,
              },
              {
                user: user2,
                createdAt: new Date(),
                weight: 200,
              },
              {
                user: user3,
                createdAt: new Date(),
                weight: 100,
              },
            ],
          }
        );

        expect(luckyUsers).toEqual([user2, user1, user3]);
      });
    });

    describe("3 users with 1, 2, 3 bookings each", () => {
      it.only("should sorted considering weights and current booking count", async () => {
        const [
          userWithOneBookingAndWeight200,
          userWithTwoBookingsAndWeight100,
          userWithThreeBookingsAndWeight100,
        ] = await Promise.all([
          createOrganizerWithBookings({
            user: { email: "test-user1@example.com" },
            bookings: [{ eventTypeId: commonEventTypeId, createdAt: new Date() }],
          }),
          createOrganizerWithBookings({
            user: { email: "test-user2@example.com" },
            bookings: [
              { eventTypeId: commonEventTypeId, createdAt: new Date() },
              { eventTypeId: commonEventTypeId, createdAt: new Date() },
            ],
          }),
          createOrganizerWithBookings({
            user: { email: "test-user3@example.com" },
            bookings: [
              { eventTypeId: commonEventTypeId, createdAt: new Date() },
              { eventTypeId: commonEventTypeId, createdAt: new Date() },
              { eventTypeId: commonEventTypeId, createdAt: new Date() },
            ],
          }),
        ]);

        const availableUsers = [
          {
            ...userWithThreeBookingsAndWeight100,
            weight: 100,
          },
          {
            ...userWithTwoBookingsAndWeight100,
            weight: 100,
          },
          {
            ...userWithOneBookingAndWeight200,
            weight: 200,
          },
        ];

        const getLuckUserParams = {
          availableUsers,
          eventType: {
            id: commonEventTypeId,
            isRRWeightsEnabled: true,
          },
          allRRHosts: [
            {
              user: availableUsers[0],
              createdAt: new Date(),
              weight: availableUsers[0].weight,
            },
            {
              user: availableUsers[1],
              createdAt: new Date(),
              weight: availableUsers[1].weight,
            },
            {
              user: userWithThreeBookingsAndWeight100,
              createdAt: new Date(),
              weight: availableUsers[2].weight,
            },
          ],
        };

        const { users: luckyUsers, usersAndTheirBookingShortfalls } = await getOrderedListOfLuckyUsers(
          DistributionMethod.PRIORITIZE_AVAILABILITY,
          {
            ...getLuckUserParams,
            availableUsers: [
              getLuckUserParams.availableUsers[0],
              ...getLuckUserParams.availableUsers.slice(1),
            ],
          }
        );

        expect(luckyUsers.map((user) => user.id)).toEqual([
          userWithOneBookingAndWeight200.id,
          userWithTwoBookingsAndWeight100.id,
          userWithThreeBookingsAndWeight100.id,
        ]);

        expect(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          usersAndTheirBookingShortfalls!.map((user) => ({
            id: user.id,
            bookingShortfall: user.bookingShortfall,
          }))
        ).toEqual(
          expect.arrayContaining([
            {
              id: userWithThreeBookingsAndWeight100.id,
              bookingShortfall: -1.5,
            },
            {
              id: userWithTwoBookingsAndWeight100.id,
              bookingShortfall: -0.5,
            },
            {
              id: userWithOneBookingAndWeight200.id,
              bookingShortfall: 2,
            },
          ])
        );
      });
    });
  });
});
