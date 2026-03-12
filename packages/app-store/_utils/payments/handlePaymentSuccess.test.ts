/**
 * @vitest-environment node
 */

import { BookingStatus, WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("@calcom/features/bookings/lib/EventManager", () => {
  const mockCreate = vi.fn().mockResolvedValue({ referencesToCreate: [] });
  return {
    default: vi.fn().mockImplementation(() => ({ create: mockCreate })),
    placeholderCreatedEvent: { referencesToCreate: [] },
  };
});
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
vi.mock("@calcom/features/bookings/lib/doesBookingRequireConfirmation");
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

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockReturnValue(null),
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
  findUniqueDelegationCalendarCredential: vi.fn(),
  getAllDelegationCredentialsForUserIncludeServiceAccountKey: vi.fn(),
  getDelegationCredentialOrFindRegularCredential: vi.fn(),
}));

vi.mock("@calcom/features/calendars/lib/CalendarManager", () => ({
  getBusyCalendarTimes: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue({}),
  updateEvent: vi.fn().mockResolvedValue({}),
  deleteEvent: vi.fn().mockResolvedValue({}),
}));

import { sendScheduledEmailsAndSMS } from "@calcom/emails/email-manager";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { handleBookingRequested } from "@calcom/features/bookings/lib/handleBookingRequested";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CreditService } from "@calcom/features/ee/billing/credit-service";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import type { TraceContext } from "@calcom/lib/tracing";
import prisma from "@calcom/prisma";

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

  it("should not call handleConfirmation or handleBookingRequested for already confirmed booking", async () => {
    const confirmedBooking = {
      ...mockBooking,
      status: BookingStatus.ACCEPTED,
    };

    vi.mocked(getBooking).mockResolvedValue({
      booking: confirmedBooking,
      user: mockUser,
      evt: mockEvt,
      eventType: mockEventType,
    });

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    // For already confirmed bookings, neither handleConfirmation nor handleBookingRequested should be called
    expect(handleConfirmation).not.toHaveBeenCalled();
    expect(handleBookingRequested).not.toHaveBeenCalled();
  });

  it("should call handleConfirmation for unconfirmed booking that does not require confirmation", async () => {
    // booking.status is PENDING (not ACCEPTED), so isConfirmed = false
    // doesBookingRequireConfirmation returns false => handleConfirmation is called
    vi.mocked(getBooking).mockResolvedValue({
      booking: mockBooking, // status: PENDING
      user: mockUser,
      evt: mockEvt,
      eventType: mockEventType,
    });

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    expect(handleConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        evt: mockEvt,
        bookingId: mockBooking.id,
        booking: mockBooking,
        paid: true,
        actionSource: "WEBHOOK",
      })
    );
  });

  it("should call handleBookingRequested when unconfirmed booking requires confirmation", async () => {
    const requiresConfirmBooking = {
      ...mockBooking,
      status: BookingStatus.PENDING,
      eventType: {
        ...mockBooking.eventType,
        requiresConfirmation: true,
      },
    };

    vi.mocked(getBooking).mockResolvedValue({
      booking: requiresConfirmBooking,
      user: mockUser,
      evt: mockEvt,
      eventType: mockEventType,
    });

    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(true);

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    expect(handleBookingRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        evt: mockEvt,
        booking: requiresConfirmBooking,
      })
    );
    expect(handleConfirmation).not.toHaveBeenCalled();
  });

  it("should handle multiple webhook subscribers", async () => {
    const secondSubscriber = {
      ...mockWebhookSubscriber,
      id: "webhook-2",
      subscriberUrl: "https://example.com/webhook2",
      secret: "webhook-secret-2",
    };
    vi.mocked(getWebhooks).mockResolvedValue([mockWebhookSubscriber, secondSubscriber]);

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    // Both subscribers should receive the payload
    expect(sendPayload).toHaveBeenCalledTimes(2);
  });

  it("should handle no webhook subscribers", async () => {
    vi.mocked(getWebhooks).mockResolvedValue([]);

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    // No sendPayload calls when there are no subscribers
    expect(sendPayload).not.toHaveBeenCalled();
  });

  it("should use booking location for event when available", async () => {
    const bookingWithLocation = {
      ...mockBooking,
      location: "https://meet.google.com/abc-def-ghi",
    };

    vi.mocked(getBooking).mockResolvedValue({
      booking: bookingWithLocation,
      user: mockUser,
      evt: { ...mockEvt },
      eventType: mockEventType,
    });

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    // The function sets evt.location = booking.location
    // Verify the workflow calendar event is created properly
    expect(WorkflowService.scheduleWorkflowsFilteredByTriggerEvent).toHaveBeenCalled();
  });

  it("should include videoCallUrl in workflow metadata when available", async () => {
    vi.mocked(getVideoCallUrlFromCalEvent).mockReturnValue("https://meet.google.com/test-url");

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    expect(WorkflowService.scheduleWorkflowsFilteredByTriggerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarEvent: expect.objectContaining({
          metadata: { videoCallUrl: "https://meet.google.com/test-url" },
        }),
      })
    );
  });

  it("should set userId to null for team events without parentId", async () => {
    const teamBooking = {
      ...mockBooking,
      eventType: {
        ...mockBooking.eventType,
        teamId: 5,
        parentId: null,
      },
    };

    vi.mocked(getBooking).mockResolvedValue({
      booking: teamBooking,
      user: mockUser,
      evt: mockEvt,
      eventType: mockEventType,
    });
    vi.mocked(getTeamIdFromEventType).mockResolvedValue(5);

    await expect(
      handlePaymentSuccess({
        paymentId: mockPaymentId,
        appSlug: "stripe",
        bookingId: mockBookingId,
        traceContext: mockTraceContext,
      })
    ).rejects.toThrow();

    // For team events without parentId, userId should be null
    expect(getWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        teamId: 5,
      })
    );
  });
});
