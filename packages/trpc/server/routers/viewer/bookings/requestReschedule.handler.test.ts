import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

const mockFindByUid = vi.fn();
const mockUpdateBookingStatus = vi.fn().mockResolvedValue(undefined);

function MockBookingRepository() {
  return {
    findByUidIncludeEventTypeAndReferences: mockFindByUid,
    updateBookingStatus: mockUpdateBookingStatus,
  };
}

function MockCalendarEventDirector() {
  return {
    setBuilder: vi.fn(),
    setExistingBooking: vi.fn(),
    setCancellationReason: vi.fn(),
    buildForRescheduleEmail: vi.fn().mockResolvedValue(undefined),
    buildWithoutEventTypeForRescheduleEmail: vi.fn().mockResolvedValue(undefined),
  };
}

function MockBookingWebhookFactory() {
  return {
    createCancelledEventPayload: vi.fn().mockReturnValue({}),
  };
}

function MockPermissionCheckService() {
  return {
    checkPermission: vi.fn().mockResolvedValue(true),
  };
}

// Mock all heavy dependencies
vi.mock("@calcom/app-store/_utils/getCalendar", () => ({ getCalendar: vi.fn() }));
vi.mock("@calcom/app-store/delegationCredential", () => ({
  getDelegationCredentialOrRegularCredential: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));
vi.mock("@calcom/emails/email-manager", () => ({
  sendRequestRescheduleEmailAndSMS: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@calcom/features/booking-audit/lib/makeActor", () => ({
  makeUserActor: vi.fn().mockReturnValue({ type: "user", id: "uuid" }),
}));
vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: vi.fn().mockReturnValue({
    onRescheduleRequested: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: vi.fn().mockReturnValue({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  }),
}));
vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn().mockReturnValue({ responses: {}, userFieldsResponses: {} }),
}));
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: MockBookingRepository,
}));
vi.mock("@calcom/features/conferencing/lib/videoClient", () => ({
  deleteMeeting: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://app.cal.com"),
}));
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowRepository", () => ({
  WorkflowRepository: { deleteAllWorkflowReminders: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: MockPermissionCheckService,
}));
vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));
vi.mock("@calcom/features/webhooks/lib/scheduleTrigger", () => ({
  deleteWebhookScheduledTriggers: vi.fn().mockResolvedValue(undefined),
  cancelNoShowTasksForBooking: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));
vi.mock("@calcom/lib/getTeamIdFromEventType", () => ({
  getTeamIdFromEventType: vi.fn().mockResolvedValue(null),
}));
vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@calcom/lib/server/service/BookingWebhookFactory", () => ({
  BookingWebhookFactory: MockBookingWebhookFactory,
}));
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));
vi.mock("@calcom/lib/builders/CalendarEvent/director", () => ({
  CalendarEventDirector: MockCalendarEventDirector,
}));

// Import after mocks
import { sendRequestRescheduleEmailAndSMS } from "@calcom/emails/email-manager";

import { requestRescheduleHandler } from "./requestReschedule.handler";

describe("requestRescheduleHandler", () => {
  const ORG_ID = 42;

  const BASE_BOOKING = {
    id: 101,
    uid: "booking-uid-123",
    userId: 1,
    status: BookingStatus.ACCEPTED,
    title: "Test Meeting",
    description: null,
    startTime: new Date("2026-04-01T10:00:00Z"),
    endTime: new Date("2026-04-01T10:30:00Z"),
    eventTypeId: 1,
    dynamicEventSlugRef: null,
    dynamicGroupSlugRef: null,
    location: "integrations:daily",
    iCalUID: "booking-uid-123@Cal.com",
    iCalSequence: 0,
    smsReminderNumber: null,
    userPrimaryEmail: "organizer@example.com",
    customInputs: {},
    destinationCalendar: null,
    user: { id: 1, email: "organizer@example.com" },
    attendees: [
      {
        id: 201,
        email: "attendee@example.com",
        name: "Attendee",
        locale: "en",
        timeZone: "UTC",
        username: null,
        phoneNumber: null,
      },
    ],
    references: [],
    workflowReminders: [],
    eventType: {
      id: 1,
      teamId: null,
      parentId: null,
      slug: "test-meeting",
      title: "Test Meeting",
      length: 30,
      hideOrganizerEmail: false,
      customReplyToEmail: null,
      bookingFields: null,
      metadata: null,
      team: null,
    },
  };

  const BASE_USER = {
    id: 1,
    email: "organizer@example.com",
    name: "Organizer",
    username: "organizer",
    timeZone: "UTC",
    locale: "en",
    uuid: "user-uuid-123",
    phoneNumber: null,
    profile: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("smtp", () => {
    it("should set organizationId from user profile on calEvent for personal event type", async () => {
      mockFindByUid.mockResolvedValue(BASE_BOOKING);

      await requestRescheduleHandler({
        ctx: { user: { ...BASE_USER, profile: { organizationId: ORG_ID } } as any },
        input: { bookingUid: "booking-uid-123", rescheduleReason: "Need to reschedule" },
        source: { type: "web" },
      });

      expect(sendRequestRescheduleEmailAndSMS).toHaveBeenCalledTimes(1);
      const calEvent = vi.mocked(sendRequestRescheduleEmailAndSMS).mock.calls[0][0];
      expect(calEvent.organizationId).toBe(ORG_ID);
    });

    it("should set organizationId from team parentId for team event type", async () => {
      const TEAM_ORG_ID = 99;
      mockFindByUid.mockResolvedValue({
        ...BASE_BOOKING,
        eventType: {
          ...BASE_BOOKING.eventType,
          teamId: 10,
          slug: "team-meeting",
          title: "Team Meeting",
          team: { id: 10, name: "Test Team", parentId: TEAM_ORG_ID },
        },
      });

      await requestRescheduleHandler({
        ctx: { user: { ...BASE_USER, profile: { organizationId: ORG_ID } } as any },
        input: { bookingUid: "booking-uid-123", rescheduleReason: "Need to reschedule" },
        source: { type: "web" },
      });

      expect(sendRequestRescheduleEmailAndSMS).toHaveBeenCalledTimes(1);
      const calEvent = vi.mocked(sendRequestRescheduleEmailAndSMS).mock.calls[0][0];
      // Team parentId takes precedence over user profile organizationId
      expect(calEvent.organizationId).toBe(TEAM_ORG_ID);
    });

    it("should set organizationId to null when user has no org profile and no team", async () => {
      mockFindByUid.mockResolvedValue(BASE_BOOKING);

      await requestRescheduleHandler({
        ctx: { user: { ...BASE_USER, profile: null } as any },
        input: { bookingUid: "booking-uid-123", rescheduleReason: "Need to reschedule" },
        source: { type: "web" },
      });

      expect(sendRequestRescheduleEmailAndSMS).toHaveBeenCalledTimes(1);
      const calEvent = vi.mocked(sendRequestRescheduleEmailAndSMS).mock.calls[0][0];
      expect(calEvent.organizationId).toBeNull();
    });
  });
});
