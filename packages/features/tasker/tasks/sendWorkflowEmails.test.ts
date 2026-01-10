import { describe, expect, vi, beforeEach, test } from "vitest";

vi.mock("@calcom/emails/workflow-email-service", () => ({
  sendCustomWorkflowEmail: vi.fn(),
}));

const mockGetBookingForCalEventBuilderFromUid = vi.fn();
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    getBookingForCalEventBuilderFromUid: mockGetBookingForCalEventBuilderFromUid,
  })),
}));

vi.mock("@calcom/features/bookings/repositories/BookingSeatRepository", () => ({
  BookingSeatRepository: vi.fn(),
}));

const mockHandleSendEmailWorkflowTask = vi.fn();
vi.mock("@calcom/features/ee/workflows/lib/service/EmailWorkflowService", () => ({
  EmailWorkflowService: vi.fn().mockImplementation(() => ({
    handleSendEmailWorkflowTask: mockHandleSendEmailWorkflowTask,
  })),
}));

vi.mock("@calcom/features/ee/workflows/repositories/WorkflowReminderRepository", () => ({
  WorkflowReminderRepository: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

vi.mock("@calcom/features/CalendarEventBuilder", () => ({
  CalendarEventBuilder: {
    fromBooking: vi.fn(),
  },
}));

import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";

import { sendWorkflowEmails, ZSendWorkflowEmailsSchema } from "./sendWorkflowEmails";

const mockSendCustomWorkflowEmail = vi.mocked(sendCustomWorkflowEmail);
const mockCalendarEventBuilder = vi.mocked(CalendarEventBuilder);

describe("sendWorkflowEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema validation", () => {
    test("should validate eager email payload", () => {
      const eagerPayload = {
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test Body</p>",
        replyTo: "reply@example.com",
        sender: "Sender Name",
        attachments: [
          {
            content: "content",
            filename: "file.txt",
          },
        ],
      };

      const result = ZSendWorkflowEmailsSchema.parse(eagerPayload);
      expect(result).toEqual(eagerPayload);
    });

    test("should validate lazy email payload", () => {
      const lazyPayload = {
        bookingUid: "booking-123",
        workflowReminderId: 1,
      };

      const result = ZSendWorkflowEmailsSchema.parse(lazyPayload);
      expect(result).toEqual(lazyPayload);
    });
  });

  describe("Eager email sending", () => {
    test("should send email with eager payload", async () => {
      const payload = {
        to: ["test@example.com", "test2@example.com"],
        subject: "Test Subject",
        html: "<p>Test Body</p>",
        replyTo: "reply@example.com",
        sender: "Sender Name",
      };

      await sendWorkflowEmails(JSON.stringify(payload));

      expect(mockSendCustomWorkflowEmail).toHaveBeenCalledTimes(2);
      expect(mockSendCustomWorkflowEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test Body</p>",
        replyTo: "reply@example.com",
        sender: "Sender Name",
      });
      expect(mockSendCustomWorkflowEmail).toHaveBeenCalledWith({
        to: "test2@example.com",
        subject: "Test Subject",
        html: "<p>Test Body</p>",
        replyTo: "reply@example.com",
        sender: "Sender Name",
      });
    });

    test("should send email with attachments", async () => {
      const payload = {
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test Body</p>",
        attachments: [
          {
            content: "base64content",
            filename: "event.ics",
          },
        ],
      };

      await sendWorkflowEmails(JSON.stringify(payload));

      expect(mockSendCustomWorkflowEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test Body</p>",
        attachments: [
          {
            content: "base64content",
            filename: "event.ics",
          },
        ],
      });
    });
  });

  describe("Lazy email generation", () => {
    test("should generate and send email with lazy payload", async () => {
      const payload = {
        bookingUid: "booking-123",
        workflowReminderId: 1,
      };

      const mockBooking = {
        uid: "booking-123",
        user: { id: 1, name: "User", email: "user@example.com" },
        eventType: { id: 1, title: "Meeting" },
      };

      const mockCalendarEvent = {
        uid: "booking-123",
        title: "Meeting",
        organizer: { email: "user@example.com" },
        attendees: [{ email: "attendee@example.com" }],
      };

      const mockBuilder = {
        build: vi.fn().mockReturnValue(mockCalendarEvent),
      } as unknown as CalendarEventBuilder;

      mockGetBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      mockCalendarEventBuilder.fromBooking.mockResolvedValue(mockBuilder);

      await sendWorkflowEmails(JSON.stringify(payload));

      expect(mockGetBookingForCalEventBuilderFromUid).toHaveBeenCalledWith("booking-123");
      expect(mockHandleSendEmailWorkflowTask).toHaveBeenCalledWith({
        evt: mockCalendarEvent,
        workflowReminderId: 1,
      });
    });

    test("should throw error if booking not found", async () => {
      const payload = {
        bookingUid: "non-existent-booking",
        workflowReminderId: 1,
      };

      mockGetBookingForCalEventBuilderFromUid.mockResolvedValue(null);

      await expect(sendWorkflowEmails(JSON.stringify(payload))).rejects.toThrow("Booking not found");
    });

    test("should throw error if calendar event cannot be built", async () => {
      const payload = {
        bookingUid: "booking-123",
        workflowReminderId: 1,
      };

      const mockBooking = {
        uid: "booking-123",
        user: { id: 1, name: "User", email: "user@example.com" },
        eventType: { id: 1, title: "Meeting" },
      };

      const mockBuilder = {
        build: vi.fn().mockReturnValue(null),
      } as unknown as CalendarEventBuilder;

      mockGetBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      mockCalendarEventBuilder.fromBooking.mockResolvedValue(mockBuilder);

      await expect(sendWorkflowEmails(JSON.stringify(payload))).rejects.toThrow(
        "Calendar event could not be built"
      );
    });
  });
});
