import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { Handler } from "./connectAndJoin.handler";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendScheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/bookings/lib/handleNewBooking/scheduleNoShowTriggers", () => ({
  scheduleNoShowTriggers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/features/eventtypes/di/EventTypeService.container", () => ({
  getEventTypeService: vi.fn(() => ({
    shouldHideBrandingForEventType: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/features/di/containers/FeaturesRepository");
vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container");

const MOCK_BOOKING_UID = "booking-uid-123";
const MOCK_USER_UUID = "user-uuid-456";
const MOCK_ORG_ID = 100;
const MOCK_TOKEN = "instant-meeting-token";

function createMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    uuid: MOCK_USER_UUID,
    email: "host@example.com",
    name: "Host User",
    username: "hostuser",
    timeZone: "UTC",
    timeFormat: 12,
    locale: "en",
    organization: { id: MOCK_ORG_ID },
    organizationId: MOCK_ORG_ID,
    ...overrides,
  } as unknown as NonNullable<TrpcSessionUser>;
}

function mockPrismaForSuccessfulJoin({ oldStatus = BookingStatus.AWAITING_HOST } = {}) {
  prisma.user.findUnique.mockResolvedValue({
    hideBranding: false,
    profiles: [],
  } as any);

  prisma.instantMeetingToken.findUnique.mockResolvedValue({
    expires: new Date(Date.now() + 60_000),
    teamId: 1,
    booking: {
      id: 10,
      status: oldStatus,
      user: { id: 99 },
    },
  } as any);

  prisma.booking.update.mockResolvedValue({
    id: 10,
    uid: MOCK_BOOKING_UID,
    title: "Instant Meeting",
    description: null,
    customInputs: {},
    startTime: new Date("2026-04-04T10:00:00Z"),
    endTime: new Date("2026-04-04T10:45:00Z"),
    location: "integrations:daily",
    userId: 1,
    status: BookingStatus.ACCEPTED,
    responses: {},
    metadata: { videoCallUrl: "https://daily.co/mock-meeting" },
    attendees: [
      {
        name: "Attendee",
        email: "attendee@example.com",
        timeZone: "UTC",
        locale: "en",
      },
    ],
    references: [
      {
        type: "daily_video",
        meetingId: "MOCK_ID",
        meetingPassword: "MOCK_PASS",
        meetingUrl: "https://daily.co/mock-meeting",
      },
    ],
    eventTypeId: 1,
    eventType: {
      id: 1,
      owner: null,
      teamId: 1,
      title: "Instant Meeting",
      slug: "instant-meeting",
      requiresConfirmation: false,
      currency: "usd",
      length: 45,
      description: null,
      price: 0,
      bookingFields: null,
      disableGuests: false,
      metadata: null,
      hideOrganizerEmail: false,
      customInputs: [],
      parentId: null,
      customReplyToEmail: null,
      team: {
        id: 1,
        name: "Test Team",
        hideBranding: false,
        parent: null,
      },
    },
  } as any);
}

describe("connectAndJoin.handler", () => {
  const mockOnBookingAccepted = vi.fn().mockResolvedValue(undefined);
  const mockCheckIfTeamHasFeature = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { getBookingEventHandlerService } = await import(
      "@calcom/features/bookings/di/BookingEventHandlerService.container"
    );
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onBookingAccepted: mockOnBookingAccepted,
    } as any);

    const { getFeaturesRepository } = await import("@calcom/features/di/containers/FeaturesRepository");
    vi.mocked(getFeaturesRepository).mockReturnValue({
      checkIfTeamHasFeature: mockCheckIfTeamHasFeature,
    } as any);
  });

  describe("booking audit event", () => {
    it("should fire booking accepted audit event with correct data", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(true);
      mockPrismaForSuccessfulJoin({ oldStatus: BookingStatus.AWAITING_HOST });

      await Handler({
        ctx: { user: createMockUser() },
        input: { token: MOCK_TOKEN },
      });

      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(MOCK_ORG_ID, "booking-audit");

      expect(mockOnBookingAccepted).toHaveBeenCalledTimes(1);
      expect(mockOnBookingAccepted).toHaveBeenCalledWith({
        bookingUid: MOCK_BOOKING_UID,
        actor: { identifiedBy: "user", userUuid: MOCK_USER_UUID },
        organizationId: MOCK_ORG_ID,
        auditData: {
          status: { old: BookingStatus.AWAITING_HOST, new: BookingStatus.ACCEPTED },
        },
        source: "WEBAPP",
        isBookingAuditEnabled: true,
      });
    });

    it("should pass isBookingAuditEnabled=false when feature is disabled", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(false);
      mockPrismaForSuccessfulJoin();

      await Handler({
        ctx: { user: createMockUser() },
        input: { token: MOCK_TOKEN },
      });

      expect(mockOnBookingAccepted).toHaveBeenCalledTimes(1);
      expect(mockOnBookingAccepted).toHaveBeenCalledWith(
        expect.objectContaining({ isBookingAuditEnabled: false })
      );
    });

    it("should not throw when audit event fails", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(true);
      mockOnBookingAccepted.mockRejectedValue(new Error("Audit handler failure"));
      mockPrismaForSuccessfulJoin();

      const result = await Handler({
        ctx: { user: createMockUser() },
        input: { token: MOCK_TOKEN },
      });

      expect(result.meetingUrl).toBe("https://daily.co/mock-meeting");
      expect(mockOnBookingAccepted).toHaveBeenCalled();
    });
  });
});
