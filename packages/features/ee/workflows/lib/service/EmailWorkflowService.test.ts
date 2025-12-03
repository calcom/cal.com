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

    test("should send to organizer only for ROUND_ROBIN scheduling type", async () => {
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

      expect(result.sendTo).toEqual(["organizer@example.com"]);
      expect(result.sendTo.length).toBe(1);
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
});
