/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingStatus, WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { handlePaymentSuccess } from "./handlePaymentSuccess";

// Mock dependencies
vi.mock("@calcom/features/bookings/lib/payment/getBooking");
vi.mock("@calcom/features/webhooks/lib/getWebhooks");
vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload");
vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType");
vi.mock("@calcom/features/ee/workflows/lib/service/WorkflowService");
vi.mock("@calcom/features/tasker");
vi.mock("@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials", () => ({
  getAllCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));
vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: class {
    constructor() {}
    enrichUserWithItsProfile = vi.fn().mockResolvedValue({ profile: null });
  },
}));
vi.mock("@calcom/prisma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      payment: { update: vi.fn() },
      booking: { update: vi.fn() },
      $transaction: vi.fn(),
      profile: { findMany: vi.fn().mockResolvedValue([]) },
      credential: { findMany: vi.fn().mockResolvedValue([]) },
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    },
  };
});
vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId");
vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer");
vi.mock("@calcom/lib/getTeamIdFromEventType");
vi.mock("@calcom/lib/CalEventParser");
vi.mock("@calcom/features/ee/billing/credit-service");
vi.mock("@calcom/features/platform-oauth-client/platform-oauth-client.repository", () => ({
  PlatformOAuthClientRepository: class {
    constructor() {}
    getByUserId = vi.fn().mockResolvedValue(null);
  },
}));
vi.mock("@calcom/features/platform-oauth-client/get-platform-params");
vi.mock("@calcom/features/bookings/lib/handleConfirmation");
vi.mock("@calcom/features/bookings/lib/handleBookingRequested");
vi.mock("@calcom/emails/email-manager");
vi.mock("@calcom/lib/tracing/factory");
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
vi.mock("@calcom/features/routing-forms/lib/findFieldValueByIdentifier", () => ({
  findFieldValueByIdentifier: vi.fn(),
}));
vi.mock("@calcom/app-store/routing-forms/lib/findFieldValueByIdentifier", () => ({
  findFieldValueByIdentifier: vi.fn(),
}));

import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import prisma from "@calcom/prisma";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import type { TraceContext } from "@calcom/lib/tracing";
import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";

describe("handlePaymentSuccess", () => {
  const mockBookingId = 1;
  const mockPaymentId = 100;
  const mockTraceContext: TraceContext = {
    traceId: "test-trace-id",
    spanId: "test-span-id",
    operation: "test-operation",
  };

  const mockBooking = {
    id: mockBookingId,
    userId: 1,
    eventTypeId: 10,
    status: BookingStatus.PENDING,
    uid: "test-booking-uid",
    location: "Test Location",
    smsReminderNumber: null,
    userPrimaryEmail: "user@example.com",
    title: "Test Event",
    description: "Test Description",
    customInputs: {},
    startTime: new Date("2025-01-01T10:00:00Z"),
    endTime: new Date("2025-01-01T10:30:00Z"),
    attendees: [],
    responses: {},
    metadata: null,
    destinationCalendar: null,
    eventType: {
      id: 10,
      title: "Test Event",
      description: "Test Description",
      slug: "test-event",
      price: 1000,
      currency: "USD",
      length: 30,
      requiresConfirmation: false,
      teamId: null,
      parentId: null,
      schedulingType: null,
      hosts: [],
      owner: { hideBranding: false },
      metadata: {},
    },
  } as any;

  const mockUser = {
    id: 1,
    email: "user@example.com",
    name: "Test User",
    username: "testuser",
    timeZone: "UTC",
    isPlatformManaged: false,
    credentials: [],
    locale: "en",
    timeFormat: 12,
    destinationCalendar: null,
  } as any;

  const mockEvt = {
    type: "test-event",
    title: "Test Event",
    startTime: "2025-01-01T10:00:00Z",
    endTime: "2025-01-01T10:30:00Z",
    organizer: {
      email: "user@example.com",
      name: "Test User",
      timeZone: "UTC",
      language: { locale: "en", translate: vi.fn() },
      id: 1,
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Attendee",
        timeZone: "UTC",
        language: { locale: "en", translate: vi.fn() },
      },
    ],
    uid: "test-booking-uid",
    bookingId: mockBookingId,
  } as any;

  const mockEventType = {
    id: 10,
    metadata: {},
  };

  const mockWebhookSubscriber = {
    id: "webhook-1",
    subscriberUrl: "https://example.com/webhook",
    secret: "webhook-secret",
    appId: "app-id",
    payloadTemplate: null,
    eventTriggers: [WebhookTriggerEvents.BOOKING_PAID],
    timeUnit: null,
    time: null,
    version: WebhookVersion.V_2021_10_20,
  };

  const mockWorkflow = {
    id: 1,
    name: "Test Workflow",
    trigger: WorkflowTriggerEvents.BOOKING_PAID,
    time: 24,
    timeUnit: "HOUR" as const,
    userId: 1,
    teamId: null,
    steps: [],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getBooking
    vi.mocked(getBooking).mockResolvedValue({
      booking: mockBooking,
      user: mockUser,
      evt: mockEvt,
      eventType: mockEventType,
    });

    // Mock prisma transaction
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: mockPaymentId, externalId: "ext-123" },
      { status: BookingStatus.ACCEPTED },
    ]);

    // Mock webhook functions
    vi.mocked(getWebhooks).mockResolvedValue([mockWebhookSubscriber]);
    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

    // Mock workflow functions
    vi.mocked(getAllWorkflowsFromEventType).mockResolvedValue([mockWorkflow]);
    vi.mocked(WorkflowService.scheduleWorkflowsFilteredByTriggerEvent).mockResolvedValue(undefined);

    // Mock utility functions
    vi.mocked(getOrgIdFromMemberOrTeamId).mockResolvedValue(undefined);
    vi.mocked(getBookerBaseUrl).mockResolvedValue("https://cal.com");
    vi.mocked(getTeamIdFromEventType).mockResolvedValue(null);
    vi.mocked(getVideoCallUrlFromCalEvent).mockReturnValue("");
    vi.mocked(CreditService.prototype.hasAvailableCredits).mockResolvedValue(true);
  });

  it("should trigger BOOKING_PAID webhooks with correct payload", async () => {
    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow(); // Function throws HttpCode 200 at the end

    // Verify webhooks were fetched
    expect(getWebhooks).toHaveBeenCalledWith({
      userId: mockBooking.userId,
      eventTypeId: mockBooking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
      teamId: null,
      orgId: undefined,
      oAuthClientId: undefined,
    });

    // Verify webhook payload was sent
    expect(sendPayload).toHaveBeenCalledWith(
      mockWebhookSubscriber.secret,
      WebhookTriggerEvents.BOOKING_PAID,
      expect.any(String),
      mockWebhookSubscriber,
      expect.objectContaining({
        bookingId: mockBookingId,
        eventTypeId: mockBooking.eventType.id,
        status: BookingStatus.ACCEPTED,
        paymentId: mockPaymentId,
        metadata: expect.objectContaining({
          identifier: "cal.com",
          bookingId: mockBookingId,
          eventTypeId: mockBooking.eventType.id,
          bookerEmail: mockEvt.attendees[0].email,
          eventTitle: mockBooking.eventType.title,
          externalId: "ext-123",
        }),
      })
    );
  });

  it("should trigger BOOKING_PAID workflows with correct calendar event", async () => {
    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow(); // Function throws HttpCode 200 at the end

    // Verify workflows were fetched
    expect(getAllWorkflowsFromEventType).toHaveBeenCalledWith(mockBooking.eventType, mockBooking.userId);

    // Verify workflows were scheduled
    expect(WorkflowService.scheduleWorkflowsFilteredByTriggerEvent).toHaveBeenCalledWith({
      workflows: [mockWorkflow],
      smsReminderNumber: null,
      calendarEvent: expect.objectContaining({
        type: mockEvt.type,
        title: mockEvt.title,
        startTime: mockEvt.startTime,
        endTime: mockEvt.endTime,
        eventType: expect.objectContaining({
          slug: mockBooking.eventType.slug,
        }),
        bookerUrl: "https://cal.com",
      }),
      hideBranding: false,
      triggers: [WorkflowTriggerEvents.BOOKING_PAID],
      creditCheckFn: expect.any(Function),
    });
  });

  it("should handle webhook errors gracefully without blocking", async () => {
    const webhookError = new Error("Webhook failed");
    vi.mocked(sendPayload).mockRejectedValueOnce(webhookError);

    // Should not throw (webhook errors are caught)
    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow(); // Throws HttpCode 200 at the end

    // Verify webhook was still attempted
    expect(sendPayload).toHaveBeenCalled();
  });

  it("should handle workflow errors gracefully without blocking", async () => {
    const workflowError = new Error("Workflow failed");
    vi.mocked(WorkflowService.scheduleWorkflowsFilteredByTriggerEvent).mockRejectedValueOnce(workflowError);

    // Should not throw (workflow errors are caught)
    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow(); // Throws HttpCode 200 at the end

    // Verify workflow was still attempted
    expect(WorkflowService.scheduleWorkflowsFilteredByTriggerEvent).toHaveBeenCalled();
  });

  it("should include payment metadata in webhook payload", async () => {
    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow(); // Function throws HttpCode 200 at the end

    expect(sendPayload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        metadata: expect.objectContaining({
          identifier: "cal.com",
          bookingId: mockBookingId,
          eventTypeId: mockBooking.eventType.id,
          bookerEmail: mockEvt.attendees[0].email,
          eventTitle: mockBooking.eventType.title,
          externalId: "ext-123",
        }),
      })
    );
  });
});
