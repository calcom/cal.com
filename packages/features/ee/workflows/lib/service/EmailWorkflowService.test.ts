import { describe, expect, vi, beforeEach, test } from "vitest";

import type { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import type { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository";
import {
  SchedulingType,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { EmailWorkflowService } from "./EmailWorkflowService";

vi.mock("@calcom/emails/workflow-email-service", () => ({
  sendCustomWorkflowEmail: vi.fn(),
}));

vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  getHideBranding: vi.fn().mockResolvedValue(false),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

vi.mock("@calcom/emails/lib/generateIcsString", () => ({
  default: vi.fn().mockReturnValue("mock-ics-content"),
}));

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants");
  return {
    ...actual,
    WEBAPP_URL: "https://cal.com",
    APP_NAME: "Cal.com",
  };
});

vi.mock("short-uuid", () => ({
  __esModule: true,
  default: () => ({ fromUUID: (uid: string) => uid }),
}));

const mockWorkflowReminderRepository: Pick<WorkflowReminderRepository, "findByIdIncludeStepAndWorkflow"> = {
  findByIdIncludeStepAndWorkflow: vi.fn(),
};

const mockBookingSeatRepository: Pick<BookingSeatRepository, "getByUidIncludeAttendee"> = {
  getByUidIncludeAttendee: vi.fn(),
};

describe("EmailWorkflowService", () => {
  let emailWorkflowService: EmailWorkflowService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailWorkflowService = new EmailWorkflowService(
      mockWorkflowReminderRepository as WorkflowReminderRepository,
      mockBookingSeatRepository as BookingSeatRepository
    );
  });

  describe("handleSendEmailWorkflowTask", () => {
    const mockEvt: Partial<CalendarEvent> = {
      uid: "booking-123",
      bookerUrl: "https://cal.com",
      title: "Test Meeting",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
      organizer: {
        name: "Organizer Name",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: { locale: "en", translate: (key: string) => key },
        timeFormat: 12,
      },
      attendees: [
        {
          name: "Attendee Name",
          email: "attendee@example.com",
          timeZone: "UTC",
          language: { locale: "en", translate: (key: string) => key },
        },
      ],
    };

    test("should throw error if workflow reminder not found", async () => {
      vi.mocked(mockWorkflowReminderRepository.findByIdIncludeStepAndWorkflow).mockResolvedValue(null);

      await expect(
        emailWorkflowService.handleSendEmailWorkflowTask({
          evt: mockEvt as CalendarEvent,
          workflowReminderId: 1,
        })
      ).rejects.toThrow("Workflow reminder not found with id 1");
    });

    test("should throw error if workflow step not verified", async () => {
      vi.mocked(mockWorkflowReminderRepository.findByIdIncludeStepAndWorkflow).mockResolvedValue({
        id: 1,
        workflowStep: {
          id: 1,
          verifiedAt: null,
          action: WorkflowActions.EMAIL_ATTENDEE,
          workflow: { userId: 1, teamId: null },
        },
      });

      await expect(
        emailWorkflowService.handleSendEmailWorkflowTask({
          evt: mockEvt as CalendarEvent,
          workflowReminderId: 1,
        })
      ).rejects.toThrow("Workflow step id 1 is not verified");
    });

    test("should throw error if workflow step not found on reminder", async () => {
      vi.mocked(mockWorkflowReminderRepository.findByIdIncludeStepAndWorkflow).mockResolvedValue({
        id: 1,
        workflowStep: null,
      });

      await expect(
        emailWorkflowService.handleSendEmailWorkflowTask({
          evt: mockEvt as CalendarEvent,
          workflowReminderId: 1,
        })
      ).rejects.toThrow("Workflow step not found on reminder with id 1");
    });

    test("should fetch seat attendee email for seated events", async () => {
      const mockWorkflowReminder = {
        id: 1,
        seatReferenceId: "seat-123",
        workflowStep: {
          id: 1,
          action: WorkflowActions.EMAIL_ATTENDEE,
          sendTo: null,
          template: WorkflowTemplates.REMINDER,
          reminderBody: null,
          emailSubject: null,
          sender: null,
          includeCalendarEvent: false,
          verifiedAt: new Date(),
          workflow: {
            userId: 1,
            teamId: null,
            trigger: WorkflowTriggerEvents.BEFORE_EVENT,
            time: 24,
            timeUnit: "HOUR",
          },
        },
      };

      vi.mocked(mockWorkflowReminderRepository.findByIdIncludeStepAndWorkflow).mockResolvedValue(
        mockWorkflowReminder
      );
      vi.mocked(mockBookingSeatRepository.getByUidIncludeAttendee).mockResolvedValue({
        attendee: {
          email: "seat-attendee@example.com",
        },
      });

      try {
        await emailWorkflowService.handleSendEmailWorkflowTask({
          evt: mockEvt as CalendarEvent,
          workflowReminderId: 1,
        });
      } catch {
        // Expected to throw due to incomplete mock setup - we only care about the seat lookup
      }

      expect(mockBookingSeatRepository.getByUidIncludeAttendee).toHaveBeenCalledWith("seat-123");
    });
  });

  describe("generateParametersToBuildEmailWorkflowContent - EMAIL_HOST", () => {
    const mockCommonScheduleFunctionParams = {
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: {
        time: 24,
        timeUnit: TimeUnit.HOUR,
      },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: new Date(),
      creditCheckFn: vi.fn().mockResolvedValue(true),
    };

    const baseMockEvt: Partial<CalendarEvent> = {
      uid: "booking-123",
      bookerUrl: "https://cal.com",
      title: "Test Meeting",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
      organizer: {
        name: "Organizer Name",
        email: "organizer@example.com",
        timeZone: "UTC",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        language: { locale: "en", translate: (() => "") as any },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeFormat: "h:mma" as any,
      },
      attendees: [
        {
          name: "Attendee Name",
          email: "attendee@example.com",
          timeZone: "UTC",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          language: { locale: "en", translate: (() => "") as any },
        },
      ],
    };

    const mockWorkflowStep = {
      id: 1,
      action: WorkflowActions.EMAIL_HOST,
      verifiedAt: new Date(),
      sendTo: null,
      template: WorkflowTemplates.REMINDER,
      reminderBody: null,
      emailSubject: null,
      sender: null,
      includeCalendarEvent: false,
      numberVerificationPending: false,
      numberRequired: false,
    };

    test("should send to organizer and team members for ROUND_ROBIN scheduling type", async () => {
      // Note: For ROUND_ROBIN, the CalendarEventBuilder filters team members to only include
      // those assigned to the booking. EmailWorkflowService sends to all team members in evt.team.members.
      const mockEvt: Partial<CalendarEvent> = {
        ...baseMockEvt,
        schedulingType: SchedulingType.ROUND_ROBIN,
        team: {
          id: 1,
          name: "Test Team",
          members: [
            {
              id: 1,
              name: "Team Member 1",
              email: "team1@example.com",
              timeZone: "UTC",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              language: { locale: "en", translate: (() => "") as any },
            },
            {
              id: 2,
              name: "Team Member 2",
              email: "team2@example.com",
              timeZone: "UTC",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              language: { locale: "en", translate: (() => "") as any },
            },
          ],
        },
      };

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        evt: mockEvt as CalendarEvent,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      // EmailWorkflowService sends to organizer + all team members in evt.team.members
      // The filtering of team members happens in CalendarEventBuilder, not here
      expect(result.sendTo).toContain("organizer@example.com");
      expect(result.sendTo).toContain("team1@example.com");
      expect(result.sendTo).toContain("team2@example.com");
      expect(result.sendTo.length).toBe(3);
    });

    test("should send to organizer and team members for COLLECTIVE scheduling type", async () => {
      const mockEvt: Partial<CalendarEvent> = {
        ...baseMockEvt,
        schedulingType: SchedulingType.COLLECTIVE,
        team: {
          id: 1,
          name: "Test Team",
          members: [
            {
              id: 1,
              name: "Team Member 1",
              email: "team1@example.com",
              timeZone: "UTC",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              language: { locale: "en", translate: (() => "") as any },
            },
            {
              id: 2,
              name: "Team Member 2",
              email: "team2@example.com",
              timeZone: "UTC",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              language: { locale: "en", translate: (() => "") as any },
            },
          ],
        },
      };

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        evt: mockEvt as CalendarEvent,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      expect(result.sendTo).toContain("organizer@example.com");
      expect(result.sendTo).toContain("team1@example.com");
      expect(result.sendTo).toContain("team2@example.com");
      expect(result.sendTo.length).toBe(3);
    });

    test("should send to organizer only when team is undefined for COLLECTIVE", async () => {
      const mockEvt: Partial<CalendarEvent> = {
        ...baseMockEvt,
        schedulingType: SchedulingType.COLLECTIVE,
        team: undefined,
      } as Partial<CalendarEvent>;

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        evt: mockEvt as CalendarEvent,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      expect(result.sendTo).toEqual(["organizer@example.com"]);
      expect(result.sendTo.length).toBe(1);
    });

    test("should send to organizer only when team members array is empty for COLLECTIVE", async () => {
      const mockEvt: Partial<CalendarEvent> = {
        ...baseMockEvt,
        schedulingType: SchedulingType.COLLECTIVE,
        team: {
          id: 1,
          name: "Test Team",
          members: [],
        },
      };

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        evt: mockEvt as CalendarEvent,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      expect(result.sendTo).toEqual(["organizer@example.com"]);
      expect(result.sendTo.length).toBe(1);
    });

    test("should send to organizer only for other scheduling types (e.g., null)", async () => {
      const mockEvt: Partial<CalendarEvent> = {
        ...baseMockEvt,
        schedulingType: null,
        team: {
          id: 1,
          name: "Test Team",
          members: [
            {
              id: 1,
              name: "Team Member 1",
              email: "team1@example.com",
              timeZone: "UTC",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              language: { locale: "en", translate: (() => "") as any },
            },
          ],
        },
      } as Partial<CalendarEvent>;

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        evt: mockEvt as CalendarEvent,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      expect(result.sendTo).toEqual(["organizer@example.com"]);
      expect(result.sendTo.length).toBe(1);
    });
  });

  describe("generateParametersToBuildEmailWorkflowContent - Form Data", () => {
    const mockCommonScheduleFunctionParams = {
      triggerEvent: WorkflowTriggerEvents.FORM_SUBMITTED,
      timeSpan: {
        time: null,
        timeUnit: null,
      },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: new Date(),
      creditCheckFn: vi.fn().mockResolvedValue(true),
    };

    const mockFormData = {
      responses: {
        "contact person": {
          value: "Jane Smith",
          response: "Jane Smith",
        },
        email: {
          value: "jane@example.com",
          response: "jane@example.com",
        },
      },
      routedEventTypeId: null,
      user: {
        email: "user@test.com",
        timeFormat: 12,
        locale: "en",
      },
    };

    test("should work with EMAIL_ADDRESS action and formData (no evt)", async () => {
      const mockWorkflowStep = {
        id: 1,
        action: WorkflowActions.EMAIL_ADDRESS,
        verifiedAt: new Date(),
        sendTo: "recipient@example.com",
        template: WorkflowTemplates.REMINDER,
        reminderBody: null,
        emailSubject: null,
        sender: null,
        includeCalendarEvent: false,
        numberVerificationPending: false,
        numberRequired: false,
      };

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        formData: mockFormData,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      expect(result.sendTo).toEqual(["recipient@example.com"]);
      expect(result.formData).toEqual(mockFormData);
      expect(result.evt).toBeUndefined();
    });

    test("should work with EMAIL_ATTENDEE action and formData (no evt)", async () => {
      const mockWorkflowStep = {
        id: 1,
        action: WorkflowActions.EMAIL_ATTENDEE,
        verifiedAt: new Date(),
        sendTo: null,
        template: WorkflowTemplates.REMINDER,
        reminderBody: null,
        emailSubject: null,
        sender: null,
        includeCalendarEvent: false,
        numberVerificationPending: false,
        numberRequired: false,
      };

      const result = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
        formData: mockFormData,
        workflowStep: mockWorkflowStep,
        workflow: { userId: 1 },
        commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
        hideBranding: false,
      });

      // Should extract email from formData responses
      expect(result.sendTo).toEqual(["jane@example.com"]);
      expect(result.formData).toEqual(mockFormData);
      expect(result.evt).toBeUndefined();
    });

    test("should throw error if neither evt nor formData is provided", async () => {
      const mockWorkflowStep = {
        id: 1,
        action: WorkflowActions.EMAIL_ADDRESS,
        verifiedAt: new Date(),
        sendTo: "recipient@example.com",
        template: WorkflowTemplates.REMINDER,
        reminderBody: null,
        emailSubject: null,
        sender: null,
        includeCalendarEvent: false,
        numberVerificationPending: false,
        numberRequired: false,
      };

      await expect(
        emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
          workflowStep: mockWorkflowStep,
          workflow: { userId: 1 },
          commonScheduleFunctionParams: mockCommonScheduleFunctionParams,
          hideBranding: false,
        })
      ).rejects.toThrow("Either evt or formData must be provided");
    });
  });

  describe("generateEmailPayloadForEvtWorkflow - ICS attachment", () => {
    const mockBookingInfo = {
      uid: "booking-123",
      bookerUrl: "https://cal.com",
      title: "Test Meeting",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
      organizer: {
        name: "Organizer Name",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: { locale: "en" },
        timeFormat: "h:mma",
      },
      attendees: [
        {
          name: "Attendee Name",
          email: "attendee@example.com",
          timeZone: "UTC",
          language: { locale: "en" },
        },
      ],
    };

    test("should NOT include ICS attachment for BOOKING_REQUESTED trigger even when includeCalendarEvent is true", async () => {
      const result = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
        evt: mockBookingInfo,
        sendTo: ["attendee@example.com"],
        hideBranding: false,
        emailSubject: "Test Subject",
        emailBody: "Test Body",
        sender: "Cal.com",
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        includeCalendarEvent: true,
        triggerEvent: WorkflowTriggerEvents.BOOKING_REQUESTED,
      });

      expect(result.attachments).toBeUndefined();
    });

    test("should include ICS attachment for BEFORE_EVENT trigger when includeCalendarEvent is true", async () => {
      const result = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
        evt: mockBookingInfo,
        sendTo: ["attendee@example.com"],
        hideBranding: false,
        emailSubject: "Test Subject",
        emailBody: "Test Body",
        sender: "Cal.com",
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        includeCalendarEvent: true,
        triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      });

      expect(result.attachments).toBeDefined();
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments?.[0].filename).toBe("event.ics");
      expect(result.attachments?.[0].contentType).toBe("text/calendar; charset=UTF-8; method=REQUEST");
    });

    test("should NOT include ICS attachment when includeCalendarEvent is false", async () => {
      const result = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
        evt: mockBookingInfo,
        sendTo: ["attendee@example.com"],
        hideBranding: false,
        emailSubject: "Test Subject",
        emailBody: "Test Body",
        sender: "Cal.com",
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        includeCalendarEvent: false,
        triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      });

      expect(result.attachments).toBeUndefined();
    });
  });

  describe("generateEmailPayloadForEvtWorkflow - Cal Video meeting URL", () => {
    const mockBookingInfoWithCalVideo = {
      uid: "booking-cal-video-123",
      bookerUrl: "https://cal.com",
      title: "Test Meeting with Cal Video",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
      organizer: {
        name: "Organizer Name",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: { locale: "en" },
        timeFormat: TimeFormat.TWELVE_HOUR,
      },
      attendees: [
        {
          name: "Attendee Name",
          email: "attendee@example.com",
          timeZone: "UTC",
          language: { locale: "en" },
        },
      ],
      videoCallData: {
        type: "daily_video",
        url: "https://test-org.daily.co/test-room-name",
        id: "test-room-name",
        password: "test-password",
      },
      location: "Cal Video",
    };

    test("should use Cal.com video URL instead of daily.co URL for REMINDER template when using Cal video", async () => {
      const result = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
        evt: mockBookingInfoWithCalVideo,
        sendTo: ["attendee@example.com"],
        hideBranding: false,
        emailSubject: "Test Subject",
        emailBody: "", // Empty body with REMINDER template triggers REMINDER template
        sender: "Cal.com",
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        includeCalendarEvent: false,
        triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      });

      // The meetingUrl should NOT contain daily.co
      expect(result.html).not.toContain("daily.co");
      // The meetingUrl should contain the Cal.com video URL format
      expect(result.html).toContain("/video/booking-cal-video-123");
    });

    test("should use Cal.com video URL instead of daily.co URL for custom template when using Cal video", async () => {
      const customEmailBody = "Join the meeting at {MEETING_URL}";
      const result = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
        evt: mockBookingInfoWithCalVideo,
        sendTo: ["attendee@example.com"],
        hideBranding: false,
        emailSubject: "Test Subject",
        emailBody: customEmailBody,
        sender: "Cal.com",
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.CUSTOM,
        includeCalendarEvent: false,
        triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      });

      // The meetingUrl should NOT contain daily.co
      expect(result.html).not.toContain("daily.co");
      // The meetingUrl should contain the Cal.com video URL format
      expect(result.html).toContain("/video/booking-cal-video-123");
    });

    test("should use Cal.com video URL format when videoCallData.url contains daily.co domain", async () => {
      const mockBookingInfoWithDailyCoUrl = {
        ...mockBookingInfoWithCalVideo,
        videoCallData: {
          type: "daily_video",
          url: "https://some-org.daily.co/another-room-name",
          id: "another-room-name",
          password: "test-password",
        },
      };

      const result = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
        evt: mockBookingInfoWithDailyCoUrl,
        sendTo: ["attendee@example.com"],
        hideBranding: false,
        emailSubject: "Test Subject",
        emailBody: "", // Empty body with REMINDER template triggers REMINDER template
        sender: "Cal.com",
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        includeCalendarEvent: false,
        triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      });

      // Even though videoCallData.url contains daily.co, the meetingUrl should NOT contain it
      expect(result.html).not.toContain("daily.co");
      expect(result.html).not.toContain("some-org.daily.co");
      expect(result.html).not.toContain("another-room-name");
      // Should use Cal.com video URL instead
      expect(result.html).toContain("/video/booking-cal-video-123");
    });
  });
});
