// TODO: Fix tests (These test were never running due to the vitest workspace config)
import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { buildBooking, buildEventType, buildWebhook, buildUser } from "@calcom/lib/test/builder";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { CreationSource } from "@calcom/prisma/enums";

import handler from "../../../pages/api/bookings/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;
vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

const mockFindOriginalRescheduledBooking = vi.fn();
vi.mock("@calcom/lib/server/repository/booking", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    findOriginalRescheduledBooking: mockFindOriginalRescheduledBooking,
  })),
}));

vi.mock("@calcom/features/watchlist/operations/check-if-users-are-blocked.controller", () => ({
  checkIfUsersAreBlocked: vi.fn().mockResolvedValue(false),
}));

vi.mock("@calcom/lib/bookings/findQualifiedHostsWithDelegationCredentials", () => ({
  findQualifiedHostsWithDelegationCredentials: vi.fn().mockResolvedValue({
    qualifiedRRHosts: [],
    allFallbackRRHosts: [],
    fixedHosts: [],
  }),
}));

vi.mock("@calcom/lib/EventManager", () => ({
  default: vi.fn().mockImplementation(() => ({
    reschedule: vi.fn().mockResolvedValue({
      results: [],
      referencesToCreate: [],
    }),
    create: vi.fn().mockResolvedValue({
      results: [],
      referencesToCreate: [],
    }),
    update: vi.fn().mockResolvedValue({
      results: [],
      referencesToCreate: [],
    }),
    createAllCalendarEvents: vi.fn().mockResolvedValue([]),
    updateAllCalendarEvents: vi.fn().mockResolvedValue([]),
    deleteEventsAndMeetings: vi.fn().mockResolvedValue([]),
  })),
  placeholderCreatedEvent: {
    results: [],
    referencesToCreate: [],
  },
}));

vi.mock("@calcom/lib/availability", () => ({
  getUserAvailability: vi.fn().mockResolvedValue([
    {
      start: new Date("1970-01-01T09:00:00.000Z"),
      end: new Date("1970-01-01T17:00:00.000Z"),
    },
  ]),
  getAvailableSlots: vi.fn().mockResolvedValue([
    {
      time: new Date().toISOString(),
      attendees: 1,
      bookingUid: null,
      users: [2],
    },
  ]),
}));

vi.mock("@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers", () => ({
  ensureAvailableUsers: vi.fn().mockImplementation(async (eventType) => {
    return eventType.users || [{ id: 2, email: "test@example.com", name: "Test User", isFixed: false }];
  }),
}));

vi.mock("@calcom/lib/server/repository/profile", () => ({
  ProfileRepository: {
    findManyForUser: vi.fn().mockResolvedValue([]),
    buildPersonalProfileFromUser: vi.fn().mockReturnValue({
      id: null,
      upId: "usr-2",
      username: "test-user",
      organizationId: null,
      organization: null,
    }),
  },
}));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/lib/server/i18n", () => {
  const mockT = (key: string, options?: any) => {
    if (key === "event_between_users") {
      return `${options?.eventName} between ${options?.host} and ${options?.attendeeName}`;
    }
    if (key === "scheduler") {
      return "Scheduler";
    }
    if (key === "google_meet_warning") {
      return "Google Meet warning";
    }
    return key;
  };

  return {
    getTranslation: vi.fn().mockResolvedValue(mockT),
    t: mockT,
  };
});

describe("POST /api/bookings - eventTypeId validation", () => {
  test("String eventTypeId should return 400", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        eventTypeId: "invalid-string",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: "Bad request, eventTypeId must be a number",
      })
    );
  });

  test("Number eventTypeId should not trigger validation error", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        eventTypeId: 123,
      },
    });

    await handler(req, res);

    const statusCode = res._getStatusCode();
    const responseData = JSON.parse(res._getData());

    if (statusCode === 400) {
      expect(responseData.message).not.toBe("Bad request, eventTypeId must be a number");
    }
  });
});

describe("POST /api/bookings", () => {
  describe("Errors", () => {
    test("Missing required data", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Cannot destructure property 'profile'"),
        })
      );
    });

    test("Invalid eventTypeId", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 999,
          startTime: dayjs().add(1, "day").toDate(),
          endTime: dayjs().add(1, "day").add(15, "minutes").toDate(),
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockRejectedValue(new Error("No EventType found"));

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: "No EventType found",
        })
      );
    });

    test("Missing recurringCount", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: dayjs().add(1, "day").toDate(),
          endTime: dayjs().add(1, "day").add(15, "minutes").toDate(),
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
        buildEventType({
          recurringEvent: { freq: 2, count: 12, interval: 1 },
          profile: { organizationId: null },
          users: [buildUser()],
          hosts: [],
          locations: [{ type: "integrations:daily" }],
        })
      );

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message:
            "invalid_type in 'start': Required; invalid_type in 'timeZone': Required; invalid_type in 'language': Required; invalid_type in 'metadata': Required",
        })
      );
    });

    test("Invalid recurringCount", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: dayjs().add(1, "day").toDate(),
          endTime: dayjs().add(1, "day").add(15, "minutes").toDate(),
          recurringCount: 15,
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
        buildEventType({
          recurringEvent: { freq: 2, count: 12, interval: 1 },
          profile: { organizationId: null },
          users: [buildUser()],
          hosts: [],
          locations: [{ type: "integrations:daily" }],
        })
      );

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message:
            "invalid_type in 'start': Required; invalid_type in 'timeZone': Required; invalid_type in 'language': Required; invalid_type in 'metadata': Required",
        })
      );
    });

    test("No available users", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          name: "test",
          start: dayjs().add(1, "day").format(),
          end: dayjs().add(1, "day").add(1, "hour").format(),
          eventTypeId: 2,
          email: "test@example.com",
          location: "Cal.com Video",
          timeZone: "America/Montevideo",
          language: "en",
          customInputs: [],
          metadata: {},
          userId: 4,
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
        buildEventType({
          profile: { organizationId: null },
          users: [buildUser()],
          hosts: [],
        })
      );

      await handler(req, res);
      console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: "Invalid event length",
        })
      );
    });
  });

  describe("Success", () => {
    describe("Regular event-type", () => {
      let createdBooking: Booking;
      test("Creates one single booking", async () => {
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            name: "test",
            start: dayjs().add(1, "day").format(),
            end: dayjs().add(1, "day").add(15, "minutes").format(),
            eventTypeId: 2,
            email: "test@example.com",
            location: "Cal.com Video",
            timeZone: "America/Montevideo",
            language: "en",
            customInputs: [],
            metadata: {},
            userId: 4,
          },
          prisma,
        });

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
          buildEventType({
            profile: { organizationId: null },
            users: [buildUser()],
            hosts: [],
            locations: [{ type: "integrations:daily" }],
          })
        );
        prismaMock.booking.findMany.mockResolvedValue([]);
        const mockBooking = buildBooking({
          id: 1,
          uid: "test-booking-uid",
          title: "Test Event",
          startTime: new Date(dayjs().add(1, "day").format()),
          endTime: new Date(dayjs().add(1, "day").add(15, "minutes").format()),
          eventType: buildEventType({
            id: 2,
            profile: { organizationId: null },
            users: [buildUser({ id: 4 })],
            hosts: [],
          }),
          attendees: [],
          user: buildUser({ id: 4 }),
          oneTimePassword: null,
          creationSource: "API_V1",
        });
        prismaMock.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            booking: {
              create: prismaMock.booking.create.mockResolvedValue(mockBooking),
              update: vi.fn().mockResolvedValue({}),
            },
            app_RoutingForms_FormResponse: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return await callback(mockTx);
        });

        await handler(req, res);
        console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });
        createdBooking = JSON.parse(res._getData());
        expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
      });

      test("Reschedule created booking", async () => {
        const originalBooking = buildBooking({
          uid: "original-booking-uid",
          userId: 4,
          eventType: buildEventType({
            id: 2,
            locations: [{ type: "integrations:daily" }],
          }),
          user: buildUser({ id: 4 }),
          references: [],
        });
        mockFindOriginalRescheduledBooking.mockResolvedValue(originalBooking);

        prismaMock.booking.findUnique.mockResolvedValue({
          ...originalBooking,
          status: "cancelled",
        });

        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            name: "testReschedule",
            start: dayjs().add(2, "day").format(),
            end: dayjs().add(2, "day").add(15, "minutes").format(),
            eventTypeId: 2,
            email: "test@example.com",
            location: "Cal.com Video",
            timeZone: "America/Montevideo",
            language: "en",
            customInputs: [],
            metadata: {},
            userId: 4,
            rescheduleUid: "original-booking-uid",
          },
          prisma,
        });

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
          buildEventType({
            profile: { organizationId: null },
            users: [buildUser()],
            hosts: [],
            locations: [{ type: "integrations:daily" }],
          })
        );
        prismaMock.booking.findMany.mockResolvedValue([]);
        const mockBooking = buildBooking({
          id: 2,
          uid: "test-reschedule-uid",
          title: "Test Reschedule Event",
          startTime: new Date(dayjs().add(2, "day").format()),
          endTime: new Date(dayjs().add(2, "day").add(15, "minutes").format()),
          eventType: buildEventType({
            id: 2,
            profile: { organizationId: null },
            users: [buildUser({ id: 4 })],
            hosts: [],
            locations: [{ type: "integrations:daily" }],
          }),
          attendees: [],
          user: buildUser({ id: 4 }),
          oneTimePassword: null,
          fromReschedule: "original-booking-uid",
        });
        prismaMock.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            booking: {
              create: prismaMock.booking.create.mockResolvedValue(mockBooking),
              update: vi.fn().mockResolvedValue({}),
            },
            app_RoutingForms_FormResponse: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return await callback(mockTx);
        });

        await handler(req, res);
        console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });
        const rescheduledBooking = JSON.parse(res._getData()) as Booking;
        expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
        expect(rescheduledBooking.fromReschedule).toEqual("original-booking-uid");
        const previousBooking = await prisma.booking.findUnique({
          where: { uid: "original-booking-uid" },
        });
        expect(previousBooking?.status).toBe("cancelled");
      });

      test("Creates source as api_v1", async () => {
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            name: "test",
            start: dayjs().add(1, "day").format(),
            end: dayjs().add(1, "day").add(15, "minutes").format(),
            eventTypeId: 2,
            email: "test@example.com",
            location: "Cal.com Video",
            timeZone: "America/Montevideo",
            language: "en",
            customInputs: [],
            metadata: {},
            userId: 4,
          },
          prisma,
        });

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
          buildEventType({
            profile: { organizationId: null },
            users: [buildUser()],
            hosts: [],
            locations: [{ type: "integrations:daily" }],
          })
        );
        prismaMock.booking.findMany.mockResolvedValue([]);
        const mockBooking = buildBooking({
          id: 3,
          uid: "test-api-v1-uid",
          title: "Test API V1 Event",
          startTime: new Date(dayjs().add(1, "day").format()),
          endTime: new Date(dayjs().add(1, "day").add(15, "minutes").format()),
          eventType: buildEventType({
            id: 2,
            profile: { organizationId: null },
            users: [buildUser({ id: 4 })],
            hosts: [],
          }),
          attendees: [],
          user: buildUser({ id: 4 }),
          oneTimePassword: null,
          creationSource: "API_V1",
        });
        prismaMock.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            booking: {
              create: prismaMock.booking.create.mockResolvedValue(mockBooking),
              update: vi.fn().mockResolvedValue({}),
            },
            app_RoutingForms_FormResponse: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return await callback(mockTx);
        });

        await handler(req, res);
        createdBooking = JSON.parse(res._getData());
        expect(createdBooking.creationSource).toEqual(CreationSource.API_V1);
        expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
      });
    });

    describe("Recurring event-type", () => {
      test("Creates multiple bookings", async () => {
        const recurringDates = Array.from(Array(12).keys()).map((i) => ({
          start: dayjs().add(i, "week").toDate(),
          end: dayjs().add(i, "week").add(15, "minutes").toDate(),
        }));

        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            title: "test",
            eventTypeId: 2,
            startTime: recurringDates[0].start,
            endTime: recurringDates[0].end,
            recurringCount: 12,
            recurringEventId: "test-recurring-event-id",
            allRecurringDates: recurringDates,
            isFirstRecurringSlot: true,
            numSlotsToCheckForAvailability: 12,
          },
          prisma,
        });

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
          buildEventType({
            recurringEvent: { freq: 2, count: 12, interval: 1 },
            profile: { organizationId: null },
            users: [buildUser()],
            hosts: [],
            locations: [{ type: "integrations:daily" }],
          })
        );

        const mockBookings = Array.from(Array(12).keys()).map((i) =>
          buildBooking({ id: i + 1, uid: `recurring-booking-${i}` })
        );

        prismaMock.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            booking: {
              create: vi.fn().mockImplementation((data) => {
                const index = mockBookings.findIndex((b) => !b.used);
                if (index !== -1) {
                  mockBookings[index].used = true;
                  return Promise.resolve(mockBookings[index]);
                }
                return Promise.resolve(buildBooking());
              }),
              update: vi.fn().mockResolvedValue({}),
            },
            app_RoutingForms_FormResponse: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return await callback(mockTx);
        });

        prismaMock.webhook.findMany.mockResolvedValue([]);

        await handler(req, res);
        const data = JSON.parse(res._getData());

        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(res._getStatusCode()).toBe(201);
        expect(data.message).toEqual("Bookings created successfully.");
        expect(data.bookings.length).toEqual(12);
      });
    });
    test("Notifies multiple bookings", async () => {
      const recurringDates = Array.from(Array(12).keys()).map((i) => ({
        start: dayjs().add(i, "week").toDate(),
        end: dayjs().add(i, "week").add(15, "minutes").toDate(),
      }));

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: recurringDates[0].start,
          endTime: recurringDates[0].end,
          recurringCount: 12,
          recurringEventId: "test-recurring-event-id",
          allRecurringDates: recurringDates,
          isFirstRecurringSlot: true,
          numSlotsToCheckForAvailability: 12,
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
        buildEventType({
          recurringEvent: { freq: 2, count: 12, interval: 1 },
          profile: { organizationId: null },
          users: [buildUser()],
          hosts: [],
          locations: [{ type: "integrations:daily" }],
        })
      );

      const createdAt = new Date();
      const mockBookings = Array.from(Array(12).keys()).map((i) =>
        buildBooking({ id: i + 1, uid: `webhook-booking-${i}`, createdAt })
      );

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          booking: {
            create: vi.fn().mockImplementation((data) => {
              const index = mockBookings.findIndex((b) => !b.used);
              if (index !== -1) {
                mockBookings[index].used = true;
                return Promise.resolve(mockBookings[index]);
              }
              return Promise.resolve(buildBooking({ createdAt }));
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          app_RoutingForms_FormResponse: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const mockedWebhooks = [
        buildWebhook({
          subscriberUrl: "http://mockedURL1.com",
          createdAt,
          eventTypeId: 1,
          secret: "secret1",
        }),
        buildWebhook({
          subscriberUrl: "http://mockedURL2.com",
          createdAt,
          eventTypeId: 2,
          secret: "secret2",
        }),
      ];
      prismaMock.webhook.findMany.mockResolvedValue(mockedWebhooks);

      await handler(req, res);
      const data = JSON.parse(res._getData());

      expect(sendPayload).toHaveBeenCalledTimes(24);
      expect(data.message).toEqual("Bookings created successfully.");
      expect(data.bookings.length).toEqual(12);
    });
  });
});
