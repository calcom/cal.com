import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeAppMetadataOptionalSchema: { parse: vi.fn().mockReturnValue({}) },
}));

vi.mock("@calcom/ee/workflows/lib/reminders/scheduleMandatoryReminder", () => ({
  scheduleMandatoryReminder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendScheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: vi.fn().mockReturnValue({
    onBookingAccepted: vi.fn().mockResolvedValue(undefined),
    onBulkBookingsAccepted: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@calcom/features/bookings/lib/EventManager", () => ({
  default: class {
    create = vi.fn().mockResolvedValue({ results: [], referencesToCreate: [] });
  },
  placeholderCreatedEvent: {},
}));

vi.mock("@calcom/features/di/containers/FeaturesRepository", () => ({
  getFeaturesRepository: vi.fn().mockReturnValue({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: class {
    hasAvailableCredits = vi.fn().mockResolvedValue(true);
  },
}));

vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://cal.com"),
}));

vi.mock("@calcom/features/ee/workflows/lib/allowDisablingStandardEmails", () => ({
  allowDisablingHostConfirmationEmails: vi.fn().mockReturnValue(false),
  allowDisablingAttendeeConfirmationEmails: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/ee/workflows/lib/service/WorkflowService", () => ({
  WorkflowService: {
    scheduleWorkflowsForNewBooking: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/webhooks/lib/scheduleTrigger", () => ({
  scheduleTrigger: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getVideoCallUrlFromCalEvent: vi.fn().mockReturnValue(""),
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/lib/getTeamIdFromEventType", () => ({
  getTeamIdFromEventType: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/lib/tracing/factory", () => ({
  distributedTracing: {
    createSpan: vi.fn().mockReturnValue({}),
    getTracingLogger: vi.fn().mockReturnValue({
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  EventTypeMetaDataSchema: { parse: vi.fn().mockReturnValue({}) },
}));

vi.mock("./getCalEventResponses", () => ({
  getCalEventResponses: vi.fn().mockReturnValue({}),
}));

vi.mock("./handleNewBooking/scheduleNoShowTriggers", () => ({
  scheduleNoShowTriggers: vi.fn().mockResolvedValue(undefined),
}));

import { BookingStatus } from "@calcom/prisma/enums";
import { handleConfirmation } from "./handleConfirmation";

const makeArgs = () => ({
  user: {
    id: 1,
    username: "testuser",
    email: "host@test.com",
    name: "Host",
    timeZone: "UTC",
    locale: "en",
    credentials: [],
    destinationCalendar: null,
  },
  evt: {
    title: "Test",
    type: "test-event",
    uid: "test-uid-123",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:30:00Z",
    attendees: [{ name: "A", email: "a@test.com", timeZone: "UTC", language: { locale: "en" } }],
    organizer: { email: "host@test.com", name: "Host", timeZone: "UTC", language: { locale: "en" } },
  },
  prisma: {
    booking: {
      update: vi.fn().mockResolvedValue({
        id: 1,
        uid: "test-uid-123",
        status: BookingStatus.ACCEPTED,
        description: null,
        location: null,
        attendees: [{ name: "A", email: "a@test.com" }],
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T10:30:00Z"),
        smsReminderNumber: null,
        cancellationReason: null,
        metadata: null,
        customInputs: {},
        title: "Test",
        responses: {},
        eventType: {
          slug: "test-event",
          bookingFields: null,
          schedulingType: null,
          hosts: [],
          owner: { hideBranding: false },
        },
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  bookingId: 1,
  booking: {
    id: 1,
    uid: "test-uid-123",
    startTime: new Date("2024-01-15T10:00:00Z"),
    eventType: {
      id: 1,
      title: "Test Event",
      description: null,
      length: 30,
      price: 0,
      currency: "usd",
      requiresConfirmation: true,
      teamId: null,
      metadata: {},
      workflows: [],
    },
    metadata: {},
    eventTypeId: 1,
    smsReminderNumber: null,
    userId: 1,
    location: null,
    status: BookingStatus.PENDING,
  },
  paid: false,
  traceContext: {},
  actionSource: { type: "system" },
  actor: { type: "system" },
});

describe("handleConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates booking status to ACCEPTED", async () => {
    const args = makeArgs();
    await handleConfirmation(args as never);

    expect(args.prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: BookingStatus.ACCEPTED,
        }),
      })
    );
  });

  it("sends scheduled emails", async () => {
    const args = makeArgs();
    await handleConfirmation(args as never);

    const { sendScheduledEmailsAndSMS } = await import("@calcom/emails/email-manager");
    expect(sendScheduledEmailsAndSMS).toHaveBeenCalled();
  });

  it("handles recurring events by updating all pending bookings", async () => {
    const args = makeArgs();
    (args as Record<string, unknown>).recurringEventId = "recurring-123";

    args.prisma.booking.findMany.mockResolvedValue([
      { id: 1, status: BookingStatus.PENDING, uid: "uid-1", metadata: {} },
      { id: 2, status: BookingStatus.PENDING, uid: "uid-2", metadata: {} },
    ]);
    args.prisma.booking.update.mockResolvedValue({
      id: 1,
      uid: "uid-1",
      status: BookingStatus.ACCEPTED,
      description: null,
      location: null,
      attendees: [],
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T10:30:00Z"),
      smsReminderNumber: null,
      cancellationReason: null,
      metadata: null,
      customInputs: {},
      title: "Test",
      responses: {},
      eventType: {
        slug: "test-event",
        bookingFields: null,
        schedulingType: null,
        hosts: [],
        owner: { hideBranding: false },
      },
    });

    await handleConfirmation(args as never);

    expect(args.prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recurringEventId: "recurring-123" }),
      })
    );
  });
});
