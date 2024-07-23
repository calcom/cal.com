import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";

import prisma from "@calcom/prisma";

import { getLuckyUser } from "./getLuckyUser";

describe("getLuckyUser tests", () => {
  describe("should not consider no show bookings for round robin when: ", () => {
    let userIds: number[] = [];
    let eventTypeId: number;

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
      eventTypeId = event.id;
    });

    afterEach(async () => {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
        },
      });

      userIds = [];
    });

    afterAll(async () => {
      await prisma.eventType.delete({
        where: {
          id: eventTypeId,
        },
      });
    });

    it("Host is a no show", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "test-user1@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user1-booking1",
                createdAt: new Date("2022-01-25T05:30:00.000Z"),
                title: "Test user 1 Booking",
                startTime: new Date(),
                endTime: new Date(),
                eventTypeId,
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
          },
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: "test-user2@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user2-booking1",
                title: "Test User 2 Booking",
                createdAt: new Date("2022-01-25T06:30:00.000Z"),
                noShowHost: true,
                startTime: new Date(),
                endTime: new Date(),
                attendees: {
                  create: [
                    {
                      name: "test-attendee",
                      email: "test-attendee@example.com",
                      timeZone: "Asia/Calcutta",
                    },
                  ],
                },
                eventTypeId,
              },
            ],
          },
        },
      });

      userIds.push(user1.id, user2.id);

      expect(
        getLuckyUser("MAXIMIZE_AVAILABILITY", {
          availableUsers: [user1, user2],
          eventTypeId,
        })
      ).resolves.toStrictEqual(user2);
    });

    it("Attendee is a no show", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "test-user1@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user1-booking1",
                createdAt: new Date("2022-01-25T05:30:00.000Z"),
                title: "Test User 1 Booking",
                startTime: new Date(),
                endTime: new Date(),
                eventTypeId,
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
          },
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: "test-user2@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user2-booking1",
                title: "Test User 2 Booking",
                createdAt: new Date("2022-01-25T06:30:00.000Z"),
                startTime: new Date(),
                endTime: new Date(),
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
                eventTypeId,
              },
            ],
          },
        },
      });

      userIds.push(user1.id, user2.id);

      expect(
        getLuckyUser("MAXIMIZE_AVAILABILITY", {
          availableUsers: [user1, user2],
          eventTypeId,
        })
      ).resolves.toStrictEqual(user2);
    });

    it("One of the attendees was host and was no show", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "test-user1@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user1-booking1",
                createdAt: new Date("2022-01-25T05:30:00.000Z"),
                title: "Test User 1 Booking",
                startTime: new Date(),
                endTime: new Date(),
                eventTypeId,
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
          },
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: "test-user2@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user2-booking1",
                title: `Test User 2 Booking`,
                createdAt: new Date("2022-01-25T06:30:00.000Z"),
                startTime: new Date(),
                endTime: new Date(),
                attendees: {
                  create: [
                    {
                      name: "test-attendee",
                      email: "test-attendee@example.com",
                      timeZone: "Asia/Calcutta",
                    },
                  ],
                },
                eventTypeId,
              },
              // User2 is fixed user, User 3 was selected as round robin host but did not show up so this booking should be counted for User 3
              {
                uid: "uuid-test-user2-booking2",
                title: `Test User 2 Booking 2`,
                createdAt: new Date("2022-01-25T07:30:00.000Z"),
                startTime: new Date(),
                endTime: new Date(),
                attendees: {
                  create: [
                    {
                      name: "test-attendee",
                      email: "test-user33@example.com",
                      timeZone: "Asia/Calcutta",
                      noShow: true,
                    },
                  ],
                },
                eventTypeId,
              },
            ],
          },
        },
      });

      const user3 = await prisma.user.create({
        data: {
          email: `test-user3@example.com`,
          bookings: {
            create: [
              {
                uid: "uuid-test-user3-booking1",
                title: `Test User 3 Booking`,
                createdAt: new Date("2022-01-25T04:30:00.000Z"),
                startTime: new Date(),
                endTime: new Date(),
                attendees: {
                  create: [
                    {
                      name: "test-attendee",
                      email: "test-attendee@example.com",
                      timeZone: "Asia/Calcutta",
                    },
                  ],
                },
                eventTypeId,
              },
            ],
          },
        },
      });

      userIds.push(user1.id, user2.id, user3.id);

      expect(
        getLuckyUser("MAXIMIZE_AVAILABILITY", {
          availableUsers: [user1, user2, user3],
          eventTypeId,
        })
      ).resolves.toStrictEqual(user3);
    });

    it("should consider booking when noShowHost is null", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "test-user1@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user1-booking1",
                createdAt: new Date("2022-01-25T07:30:00.000Z"),
                title: "Test user 1 Booking",
                startTime: new Date(),
                noShowHost: null,
                endTime: new Date(),
                eventTypeId,
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
          },
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: "test-user2@example.com",
          bookings: {
            create: [
              {
                uid: "uuid-test-user2-booking1",
                title: "Test User 2 Booking",
                createdAt: new Date("2022-01-25T06:30:00.000Z"),
                noShowHost: null,
                startTime: new Date(),
                endTime: new Date(),
                attendees: {
                  create: [
                    {
                      name: "test-attendee",
                      email: "test-attendee@example.com",
                      timeZone: "Asia/Calcutta",
                    },
                  ],
                },
                eventTypeId,
              },
            ],
          },
        },
      });

      userIds.push(user1.id, user2.id);

      expect(
        getLuckyUser("MAXIMIZE_AVAILABILITY", {
          availableUsers: [user1, user2],
          eventTypeId,
        })
      ).resolves.toStrictEqual(user2);
    });
  });
});
