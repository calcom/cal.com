import type { TFunction } from "i18next";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { sendSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import prisma from "@calcom/prisma";

import SMSManager from "../sms-manager";

// Mock dependencies
vi.mock("@calcom/lib/checkRateLimitAndThrowError");
vi.mock("@calcom/features/ee/workflows/lib/reminders/messageDispatcher");
vi.mock("@calcom/lib/isSmsCalEmail");
vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findUnique: vi.fn(),
    },
  },
}));

// Create a concrete implementation of SMSManager for testing
class TestSMSManager extends SMSManager {
  getMessage(attendee: any): string {
    return `Test message for ${attendee.name}`;
  }
}

describe("SMSManager", () => {
  const mockTranslate = ((key: string) => key) as TFunction;
  const mockCalEvent = {
    uid: "test-booking-uid",
    type: "test",
    title: "Test Event",
    startTime: "2024-03-20T10:00:00Z",
    endTime: "2024-03-20T11:00:00Z",
    attendees: [
      {
        name: "John Doe",
        email: "john@example.com",
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
    (isSmsCalEmail as any).mockReturnValue(true);
  });

  describe("sendSMSToAttendee", () => {
    test("should not send SMS if phone number is missing", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const attendeeWithoutPhone = {
        ...mockCalEvent.attendees[0],
        phoneNumber: undefined,
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
      };

      await smsManager.sendSMSToAttendee(attendeeWithoutPhone);

      expect(sendSmsOrFallbackEmail).not.toHaveBeenCalled();
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
      (prisma.team.findUnique as any).mockResolvedValue({
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

    test("should send SMS successfully for valid attendee", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockSmsResponse = { success: true };

      (sendSmsOrFallbackEmail as any).mockResolvedValue(mockSmsResponse);
      (checkSMSRateLimit as any).mockResolvedValue(undefined);

      const result = await smsManager.sendSMSToAttendee(mockCalEvent.attendees[0], "test-booking-uid");

      expect(checkSMSRateLimit).toHaveBeenCalledWith({
        identifier: "handleSendingSMS:user:1",
        rateLimitingType: "sms",
      });

      expect(sendSmsOrFallbackEmail).toHaveBeenCalledWith({
        twilioData: {
          phoneNumber: mockCalEvent.attendees[0].phoneNumber,
          body: expect.stringContaining(mockCalEvent.attendees[0].name),
          sender: expect.any(String),
          teamId: undefined,
          bookingUid: "test-booking-uid",
        },
      });

      expect(result).toEqual(mockSmsResponse);
    });

    test("should handle SMS sending errors", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockError = new Error("SMS sending failed");

      (sendSmsOrFallbackEmail as any).mockRejectedValue(mockError);
      (checkSMSRateLimit as any).mockResolvedValue(undefined);

      await expect(smsManager.sendSMSToAttendee(mockCalEvent.attendees[0])).rejects.toThrow(mockError);
    });
  });

  describe("sendSMSToAttendees", () => {
    test("should send SMS to all attendees", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockSmsResponse = { success: true };

      (sendSmsOrFallbackEmail as any).mockResolvedValue(mockSmsResponse);
      (checkSMSRateLimit as any).mockResolvedValue(undefined);

      await smsManager.sendSMSToAttendees();

      expect(sendSmsOrFallbackEmail).toHaveBeenCalledTimes(mockCalEvent.attendees.length);
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

      (prisma.team.findUnique as any).mockResolvedValue({
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
