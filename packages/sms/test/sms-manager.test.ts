import type { TFunction } from "i18next";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { sendSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { checkSMSRateLimit } from "@calcom/lib/smsLockState";
import prisma from "@calcom/prisma";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

vi.mock("@calcom/lib/smsLockState");
vi.mock("@calcom/features/ee/workflows/lib/reminders/messageDispatcher");
vi.mock("@calcom/prisma", () => {
  const mockObj = {
    team: {
      findUnique: vi.fn(),
    },
  };
  return {
    default: mockObj,
    prisma: mockObj,
  };
});

interface TestAttendee extends Person {
  name: string;
  email: string;
  phoneNumber?: string;
  timeZone: string;
  language: {
    translate: TFunction;
    locale: string;
  };
}

interface TestCalEvent extends CalendarEvent {
  uid: string;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: TestAttendee[];
  organizer: {
    id: number;
    name: string;
    email: string;
    timeZone: string;
    language: {
      translate: TFunction;
      locale: string;
    };
  };
  team?: {
    id: number;
    name: string;
    members: unknown[];
  };
}

// Create a concrete implementation of SMSManager for testing
class TestSMSManager extends SMSManager {
  getMessage(attendee: TestAttendee): string {
    return `Test message for ${attendee.name}`;
  }
}

describe("SMSManager", () => {
  const mockTranslate = ((key: string) => key) as TFunction;
  const mockCalEvent: TestCalEvent = {
    uid: "test-booking-uid",
    type: "test",
    title: "Test Event",
    startTime: "2024-03-20T10:00:00Z",
    endTime: "2024-03-20T11:00:00Z",
    attendees: [
      {
        name: "John Doe",
        email: "john@sms.cal.com",
        phoneNumber: "+1234567890",
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        phoneNumber: "+1987654321",
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
      },
    ],
    organizer: {
      id: 1,
      name: "Organizer",
      email: "organizer@example.com",
      timeZone: "America/New_York",
      language: { translate: mockTranslate, locale: "en" },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendSMSToAttendee", () => {
    test("should not send SMS if phone number is missing", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const attendeeWithoutPhone: TestAttendee = {
        ...mockCalEvent.attendees[0],
        phoneNumber: undefined,
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
      };

      await smsManager.sendSMSToAttendee(attendeeWithoutPhone);

      expect(sendSmsOrFallbackEmail).not.toHaveBeenCalled();
    });

    test("should not send SMS if email is not @sms.cal.com", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const attendeeWithRegularEmail: TestAttendee = {
        ...mockCalEvent.attendees[0],
        email: "john@example.com",
        phoneNumber: "+1234567890",
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
      };

      await smsManager.sendSMSToAttendee(attendeeWithRegularEmail);

      expect(sendSmsOrFallbackEmail).not.toHaveBeenCalled();
    });

    test("should send SMS only when both phone number and @sms.cal.com email are present", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockSmsResponse = { success: true };

      (sendSmsOrFallbackEmail as jest.Mock).mockResolvedValue(mockSmsResponse);
      (checkSMSRateLimit as jest.Mock).mockResolvedValue(undefined);

      const result = await smsManager.sendSMSToAttendee(mockCalEvent.attendees[0], "test-booking-uid");

      expect(checkSMSRateLimit).toHaveBeenCalledWith({
        identifier: "handleSendingSMS:org-user-1",
        rateLimitingType: "sms",
      });

      expect(sendSmsOrFallbackEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          twilioData: expect.objectContaining({
            phoneNumber: mockCalEvent.attendees[0].phoneNumber,
            body: expect.stringContaining(mockCalEvent.attendees[0].name),
            sender: expect.any(String),
            userId: 1,
            bookingUid: "test-booking-uid",
          }),
          creditCheckFn: expect.any(Function),
        })
      );

      expect(result).toEqual(mockSmsResponse);
    });

    test("should not send SMS if SMS notifications are disabled for team", async () => {
      const mockTeamId = 123;
      const mockTeam = {
        id: mockTeamId,
        name: "Test Team",
        members: [],
      };
      const smsManager = new TestSMSManager({
        ...mockCalEvent,
        team: mockTeam,
      });

      // Mock team settings to disable SMS
      (prisma.team.findUnique as jest.Mock).mockResolvedValue({
        parent: {
          isOrganization: true,
          organizationSettings: {
            disablePhoneOnlySMSNotifications: true,
          },
        },
      });

      await smsManager.sendSMSToAttendee(mockCalEvent.attendees[0]);

      expect(sendSmsOrFallbackEmail).not.toHaveBeenCalled();
    });

    test("should handle SMS sending errors", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockError = new Error("SMS sending failed");

      (sendSmsOrFallbackEmail as jest.Mock).mockRejectedValue(mockError);
      (checkSMSRateLimit as jest.Mock).mockResolvedValue(undefined);

      await expect(smsManager.sendSMSToAttendee(mockCalEvent.attendees[0])).rejects.toThrow(mockError);
    });
  });

  describe("sendSMSToAttendees", () => {
    test("should send SMS only to attendees with phone number and @sms.cal.com email", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockSmsResponse = { success: true };

      (sendSmsOrFallbackEmail as jest.Mock).mockResolvedValue(mockSmsResponse);
      (checkSMSRateLimit as jest.Mock).mockResolvedValue(undefined);

      await smsManager.sendSMSToAttendees();

      // Only one attendee has both phone number and @sms.cal.com email
      expect(sendSmsOrFallbackEmail).toHaveBeenCalledTimes(1);
    });

    test("should not send SMS if notifications are disabled", async () => {
      const mockTeamId = 123;
      const mockTeam = {
        id: mockTeamId,
        name: "Test Team",
        members: [],
      };
      const smsManager = new TestSMSManager({
        ...mockCalEvent,
        team: mockTeam,
      });

      (prisma.team.findUnique as jest.Mock).mockResolvedValue({
        parent: {
          isOrganization: true,
          organizationSettings: {
            disablePhoneOnlySMSNotifications: true,
          },
        },
      });

      await smsManager.sendSMSToAttendees();

      expect(sendSmsOrFallbackEmail).not.toHaveBeenCalled();
    });
  });

  describe("getFormattedTime and getFormattedDate", () => {
    test("should format time correctly", () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const formattedTime = smsManager.getFormattedTime("America/New_York", "en", "2024-03-20T10:00:00Z");

      expect(formattedTime).toContain("2024");
      expect(formattedTime).toContain("6:00am");
    });

    test("should format date range correctly", () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const formattedDate = smsManager.getFormattedDate("America/New_York", "en");

      expect(formattedDate).toContain("2024");
      expect(formattedDate).toContain("6:00am");
      expect(formattedDate).toContain("7:00am");
    });
  });
});
