// TODO: Fix tests (These test were never running due to the vitest workspace config)
import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import dayjs from "@calcom/dayjs";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { buildBooking, buildEventType, buildUser, buildWebhook } from "@calcom/lib/test/builder";
import { prisma } from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { BookingStatus, CreationSource } from "@calcom/prisma/enums";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { beforeEach, describe, expect, test, vi } from "vitest";
import handler from "../../../pages/api/bookings/_post";

vi.mock("@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB", () => ({
  getEventTypesFromDB: vi.fn(),
}));

const mockEventTypeData = {
  eventType: {
    id: 1,
    title: "Test Event",
    profile: { organizationId: null },
    users: [{ id: 1, email: "test@example.com", credentials: [] }],
    hosts: [],
    customInputs: [],
    recurringEvent: null,
    length: 15,
    slug: "test-event",
    price: 0,
    currency: "USD",
    requiresConfirmation: false,
    disableGuests: false,
    minimumBookingNotice: 120,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    seatsPerTimeSlot: null,
    seatsShowAttendees: false,
    schedulingType: null,
    periodType: "UNLIMITED",
    periodStartDate: null,
    periodEndDate: null,
    periodDays: null,
    periodCountCalendarDays: false,
    locations: [],
    metadata: {},
    successRedirectUrl: null,
    description: null,
    team: null,
    owner: { id: 1, email: "test@example.com", credentials: [] },
  },
  users: [{ id: 1, email: "test@example.com", credentials: [] }],
  allCredentials: [],
  destinationCalendar: null,
};

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;
vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

const mockFindOriginalRescheduledBooking = vi.fn();
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(function () {
    return {
      findOriginalRescheduledBooking: mockFindOriginalRescheduledBooking,
    };
  }),
}));

vi.mock("@calcom/features/watchlist/operations/check-if-users-are-blocked.controller", () => ({
  checkIfUsersAreBlocked: vi.fn().mockResolvedValue(false),
}));

vi.mock("@calcom/features/watchlist/operations/filter-blocked-users.controller", () => ({
  filterBlockedUsers: vi.fn().mockImplementation(async (users) => ({
    eligibleUsers: users,
    blockedCount: 0,
  })),
}));

vi.mock("@calcom/features/di/containers/QualifiedHosts", () => ({
  getQualifiedHostsService: vi.fn().mockReturnValue({
    findQualifiedHostsWithDelegationCredentials: vi.fn().mockResolvedValue({
      qualifiedRRHosts: [],
      allFallbackRRHosts: [],
      fixedHosts: [],
    }),
  }),
}));

vi.mock("@calcom/features/bookings/lib/EventManager", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
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
    };
  }),
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

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
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
  FeaturesRepository: vi.fn().mockImplementation(function () {
    return {
      checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
      checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
    };
  }),
}));

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflows", () => ({
  getAllWorkflows: vi.fn().mockResolvedValue([]),
  workflowSelect: {},
}));

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([]),
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

    prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(
      buildEventType({
        id: 123,
        profileId: null,
        locations: [{ type: "integrations:daily" }],
      })
    );

    await handler(req, res);

    const statusCode = res._getStatusCode();
    const responseData = JSON.parse(res._getData());

    if (statusCode === 400) {
      expect(responseData.message).not.toBe("Bad request, eventTypeId must be a number");
    }
  });
});

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOriginalRescheduledBooking.mockResolvedValue(null);

    (getEventTypesFromDB as any).mockResolvedValue(mockEventTypeData.eventType);
  });

  describe("Errors", () => {
    test("Missing required data", async () => {
      (getEventTypesFromDB as any).mockRejectedValue(new Error(ErrorCode.RequestBodyInvalid));

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          eventTypeId: 2,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: ErrorCode.RequestBodyInvalid,
        })
      );
    });

    test("Invalid eventTypeId", async () => {
      (getEventTypesFromDB as any).mockRejectedValue(new Error(ErrorCode.EventTypeNotFound));

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

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: ErrorCode.EventTypeNotFound,
        })
      );
    });

    test.skip("Missing recurringCount", async () => {
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

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
        ...buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } }),
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        profile: { organizationId: null },
        hosts: [],
        users: [buildUser()],
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("recurringCount"),
        })
      );
    });

    test.skip("Invalid recurringCount", async () => {
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
          recurringCount: 15,
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
        ...buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } }),
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        profile: { organizationId: null },
        hosts: [],
        users: [buildUser()],
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("recurringCount"),
        })
      );
    });

    test.skip("No available users", async () => {
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

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
        ...buildEventType({ profileId: null }),
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        profile: { organizationId: null },
        hosts: [],
        users: [buildUser()],
      });

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

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
          ...buildEventType({ profileId: null, length: 15 }),
          // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
          profile: { organizationId: null },
          hosts: [],
          users: [buildUser()],
        });
        prismaMock.booking.findMany.mockResolvedValue([]);
        const mockBooking = buildBooking({
          id: 1,
          uid: "test-booking-uid",
          title: "Test Event",
          startTime: new Date(dayjs().add(1, "day").format()),
          endTime: new Date(dayjs().add(1, "day").add(15, "minutes").format()),
          eventTypeId: buildEventType({
            id: 2,
            profileId: null,
          }).id,
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
          return await callback(prismaMock);
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
          eventTypeId: buildEventType({
            id: 2,
            locations: [{ type: "integrations:daily" }],
          }).id,
          references: [],
        });
        mockFindOriginalRescheduledBooking.mockResolvedValue(originalBooking);

        prismaMock.booking.findUnique.mockResolvedValue({
          ...originalBooking,
          status: "CANCELLED",
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

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
          ...buildEventType({ profileId: null, length: 15 }),
          // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
          profile: { organizationId: null },
          hosts: [],
          users: [buildUser()],
        });
        prismaMock.booking.findMany.mockResolvedValue([]);
        const mockBooking = buildBooking({
          id: 2,
          uid: "test-reschedule-uid",
          title: "Test Reschedule Event",
          startTime: new Date(dayjs().add(2, "day").format()),
          endTime: new Date(dayjs().add(2, "day").add(15, "minutes").format()),
          eventTypeId: buildEventType({
            id: 2,
            profileId: null,
            locations: [{ type: "integrations:daily" }],
          }).id,
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
          return await callback(prismaMock);
        });

        await handler(req, res);
        console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });
        const rescheduledBooking = JSON.parse(res._getData()) as Booking;
        expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
        expect(rescheduledBooking.fromReschedule).toEqual("original-booking-uid");
        const previousBooking = await prisma.booking.findUnique({
          where: { uid: "original-booking-uid" },
        });
        expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
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

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
          ...buildEventType({ profileId: null, length: 15 }),
          // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
          profile: { organizationId: null },
          hosts: [],
          users: [buildUser()],
        });
        prismaMock.booking.findMany.mockResolvedValue([]);
        const mockBooking = buildBooking({
          id: 3,
          uid: "test-api-v1-uid",
          title: "Test API V1 Event",
          startTime: new Date(dayjs().add(1, "day").format()),
          endTime: new Date(dayjs().add(1, "day").add(15, "minutes").format()),
          eventTypeId: buildEventType({
            id: 2,
            profileId: null,
          }).id,
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
          return await callback(prismaMock);
        });

        await handler(req, res);
        createdBooking = JSON.parse(res._getData());
        expect(createdBooking.creationSource).toEqual(CreationSource.API_V1);
        expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
      });
    });

    describe("Recurring event-type", () => {
      test.skip("Creates multiple bookings", async () => {
        const recurringDates = Array.from(Array(12).keys()).map((i) => ({
          start: dayjs().add(1, "day").add(i, "week").toISOString(),
          end: dayjs().add(1, "day").add(i, "week").add(15, "minutes").toISOString(),
        }));

        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            title: "test",
            eventTypeId: 2,
            start: recurringDates[0].start,
            end: recurringDates[0].end,
            timeZone: "UTC",
            language: "en",
            responses: {
              name: "Test User",
              email: "test@example.com",
              location: { optionValue: "", value: "integrations:daily" },
            },
            metadata: {},
            recurringCount: 12,
            recurringEventId: "test-recurring-event-id",
            allRecurringDates: recurringDates,
            isFirstRecurringSlot: true,
            numSlotsToCheckForAvailability: 12,
          },
          prisma,
        });

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
          ...buildEventType({ profileId: null, length: 15 }),
          // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
          profile: { organizationId: null },
          hosts: [],
          users: [buildUser()],
        });

        const mockBookings = Array.from(Array(12).keys()).map((i) =>
          buildBooking({ id: i + 1, uid: `recurring-booking-${i}` })
        );

        prismaMock.booking.create.mockResolvedValue(buildBooking({ id: 1, uid: "test-booking-uid" }));
        prismaMock.$transaction.mockImplementation(async (callback) => {
          return await callback(prismaMock);
        });

        prismaMock.webhook.findMany.mockResolvedValue([]);

        await handler(req, res);
        const data = JSON.parse(res._getData());

        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(res._getStatusCode()).toBe(200);
        expect(data.message).toEqual("Bookings created successfully.");
        expect(data.bookings.length).toEqual(12);
      });
    });
    test.skip("Notifies multiple bookings", async () => {
      const recurringDates = Array.from(Array(12).keys()).map((i) => ({
        start: dayjs().add(1, "day").add(i, "week").toISOString(),
        end: dayjs().add(1, "day").add(i, "week").add(15, "minutes").toISOString(),
      }));

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          start: recurringDates[0].start,
          end: recurringDates[0].end,
          timeZone: "UTC",
          language: "en",
          responses: {
            name: "Test User",
            email: "test@example.com",
            location: { optionValue: "", value: "integrations:daily" },
          },
          metadata: {},
          recurringCount: 12,
          recurringEventId: "test-recurring-event-id",
          allRecurringDates: recurringDates,
          isFirstRecurringSlot: true,
          numSlotsToCheckForAvailability: 12,
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue({
        ...buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } }),
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        profile: { organizationId: null },
        hosts: [],
        users: [buildUser()],
      });

      const createdAt = new Date();
      const mockBookings = Array.from(Array(12).keys()).map((i) =>
        buildBooking({ id: i + 1, uid: `webhook-booking-${i}`, createdAt })
      );

      prismaMock.booking.create.mockResolvedValue(buildBooking({ id: 1, uid: "test-booking-uid" }));
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaMock);
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
