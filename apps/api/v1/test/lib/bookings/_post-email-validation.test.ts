import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { buildEventType, buildUser } from "@calcom/lib/test/builder";
import { prisma } from "@calcom/prisma";

import handler from "../../../pages/api/bookings/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const mockFindOriginalRescheduledBooking = vi.fn();
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    findOriginalRescheduledBooking: mockFindOriginalRescheduledBooking,
  })),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
  })),
  withSelectedCalendars: vi.fn().mockReturnValue({
    findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("@calcom/features/watchlist/operations/check-if-users-are-blocked.controller", () => ({
  checkIfUsersAreBlocked: vi.fn().mockResolvedValue(false),
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
  default: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      results: [],
      referencesToCreate: [],
    }),
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
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflows", () => ({
  getAllWorkflows: vi.fn().mockResolvedValue([]),
  workflowSelect: {},
}));

vi.mock("@calcom/trpc/server/routers/viewer/workflows/util", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/lib/server/i18n", () => {
  const mockT = (key: string, options?: Record<string, string>) => {
    if (key === "event_between_users") {
      return `${options?.eventName} between ${options?.host} and ${options?.attendeeName}`;
    }
    if (key === "scheduler") {
      return "Scheduler";
    }
    return key;
  };

  return {
    getTranslation: vi.fn().mockResolvedValue(mockT),
    t: mockT,
  };
});

describe("POST /api/bookings - Email Validation for Legacy customInputs Path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOriginalRescheduledBooking.mockResolvedValue(null);
  });

  describe("Invalid primary email", () => {
    test("should return 400 with ZodError message for invalid primary email", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          name: "Test User",
          start: dayjs().add(1, "day").format(),
          end: dayjs().add(1, "day").add(15, "minutes").format(),
          eventTypeId: 1,
          email: "rua juranda 172", // Invalid email (street address)
          guests: [],
          notes: "",
          location: "Cal.com Video",
          smsReminderNumber: null,
          rescheduleReason: "",
          timeZone: "America/Sao_Paulo",
          language: "pt-BR",
          customInputs: [],
          metadata: {},
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

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain("Invalid email");
    });
  });

  describe("Invalid guest email", () => {
    test("should return 400 with ZodError message for invalid guest email", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          name: "Test User",
          start: dayjs().add(1, "day").format(),
          end: dayjs().add(1, "day").add(15, "minutes").format(),
          eventTypeId: 1,
          email: "valid@example.com",
          guests: ["claudovinorosaNúmero 530 novo SãoGeraldo"], // Invalid guest email (street address)
          notes: "",
          location: "Cal.com Video",
          smsReminderNumber: null,
          rescheduleReason: "",
          timeZone: "America/Sao_Paulo",
          language: "pt-BR",
          customInputs: [],
          metadata: {},
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

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain("Invalid guest email");
    });
  });

  describe("Valid emails succeed", () => {
    test("should succeed with valid primary and guest emails", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          name: "Test User",
          start: dayjs().add(1, "day").format(),
          end: dayjs().add(1, "day").add(15, "minutes").format(),
          eventTypeId: 1,
          email: "valid@example.com",
          guests: ["guest1@example.com", "guest2@example.com"],
          notes: "",
          location: "Cal.com Video",
          smsReminderNumber: null,
          rescheduleReason: "",
          timeZone: "America/Sao_Paulo",
          language: "pt-BR",
          customInputs: [],
          metadata: {},
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

      await handler(req, res);

      const statusCode = res._getStatusCode();
      expect(statusCode).not.toBe(400);
    });
  });
});
