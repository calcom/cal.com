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

const MOCK_ORG_ID = 100;
const MOCK_TOKEN = "instant-meeting-token";

function createMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    uuid: "user-uuid-456",
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
    uid: "booking-uid-123",
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
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("should return meeting URL on successful join", async () => {
    mockPrismaForSuccessfulJoin();

    const result = await Handler({
      ctx: { user: createMockUser() },
      input: { token: MOCK_TOKEN },
    });

    expect(result.meetingUrl).toBe("https://daily.co/mock-meeting");
  });
});
