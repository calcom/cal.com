import { checkSMSRateLimit } from "@calcom/lib/smsLockState";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SMSManager from "../sms-manager";

vi.mock("@calcom/lib/smsLockState");

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
}

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
    vi.mocked(checkSMSRateLimit).mockResolvedValue(undefined);
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

      expect(checkSMSRateLimit).not.toHaveBeenCalled();
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

      expect(checkSMSRateLimit).not.toHaveBeenCalled();
    });

    test("should check SMS rate limit only when phone number and @sms.cal.com email are present", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);

      await smsManager.sendSMSToAttendee(mockCalEvent.attendees[0]);

      expect(checkSMSRateLimit).toHaveBeenCalledWith({
        identifier: "handleSendingSMS:org-user-1",
        rateLimitingType: "sms",
      });
    });

    test("should propagate SMS rate limiting errors", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const mockError = new Error("Rate limit failed");
      vi.mocked(checkSMSRateLimit).mockRejectedValue(mockError);

      await expect(smsManager.sendSMSToAttendee(mockCalEvent.attendees[0])).rejects.toThrow(mockError);
    });
  });

  describe("sendSMSToAttendees", () => {
    test("should check rate limit only for attendees with phone number and @sms.cal.com email", async () => {
      const smsManager = new TestSMSManager(mockCalEvent);

      await smsManager.sendSMSToAttendees();

      expect(checkSMSRateLimit).toHaveBeenCalledTimes(1);
    });

    test("should not check rate limit if no attendee qualifies", async () => {
      const smsManager = new TestSMSManager({
        ...mockCalEvent,
        attendees: [
          {
            ...mockCalEvent.attendees[0],
            email: "john@example.com",
          },
        ],
      });

      await smsManager.sendSMSToAttendees();

      expect(checkSMSRateLimit).not.toHaveBeenCalled();
    });
  });

  describe("getFormattedTime and getFormattedDate", () => {
    test("should format time correctly", () => {
      const smsManager = new TestSMSManager(mockCalEvent);
      const formattedTime = smsManager.getFormattedTime(
        "America/New_York",
        "en",
        "2024-03-20T10:00:00Z"
      );

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
