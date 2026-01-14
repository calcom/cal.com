import { describe, expect, it } from "vitest";

import { getEditDetailsLink } from "./CalEventParser";

describe("getEditDetailsLink", () => {
  const mockCalEvent = {
    uid: "test-booking-uid-123",
    bookerUrl: "https://app.cal.com",
  };

  const mockAttendee = {
    email: "attendee@example.com",
    name: "Test Attendee",
    timeZone: "America/New_York",
    language: {
      translate: (key: string) => key,
    },
  };

  describe("Basic functionality", () => {
    it("should generate correct edit details link with email parameter", () => {
      const result = getEditDetailsLink({
        calEvent: mockCalEvent,
        attendee: mockAttendee,
      });

      expect(result).toContain("https://app.cal.com/booking/test-booking-uid-123");
      expect(result).toContain("email=attendee%40example.com");
    });

    it("should use WEBAPP_URL when bookerUrl is not provided", () => {
      const result = getEditDetailsLink({
        calEvent: { ...mockCalEvent, bookerUrl: undefined },
        attendee: mockAttendee,
      });

      // Should contain the booking path with email param
      expect(result).toContain("/booking/test-booking-uid-123");
      expect(result).toContain("email=attendee%40example.com");
    });
  });

  describe("Seat bookings", () => {
    it("should include seatReferenceUid when present", () => {
      const calEventWithSeat = {
        ...mockCalEvent,
        attendeeSeatId: "seat-reference-123",
      };

      const result = getEditDetailsLink({
        calEvent: calEventWithSeat,
        attendee: mockAttendee,
      });

      expect(result).toContain("seatReferenceUid=seat-reference-123");
    });

    it("should not include seatReferenceUid when not present", () => {
      const result = getEditDetailsLink({
        calEvent: mockCalEvent,
        attendee: mockAttendee,
      });

      expect(result).not.toContain("seatReferenceUid");
    });
  });

  describe("Platform bookings", () => {
    it("should return empty string for platform bookings", () => {
      const platformCalEvent = {
        ...mockCalEvent,
        platformClientId: "platform-client-id",
      };

      const result = getEditDetailsLink({
        calEvent: platformCalEvent,
        attendee: mockAttendee,
      });

      expect(result).toBe("");
    });
  });

  describe("Special characters in email", () => {
    it("should properly URL encode email with special characters", () => {
      const attendeeWithSpecialEmail = {
        ...mockAttendee,
        email: "test+filter@example.com",
      };

      const result = getEditDetailsLink({
        calEvent: mockCalEvent,
        attendee: attendeeWithSpecialEmail,
      });

      expect(result).toContain("email=test%2Bfilter%40example.com");
    });

    it("should properly URL encode email with dots", () => {
      const attendeeWithDots = {
        ...mockAttendee,
        email: "first.last@sub.example.com",
      };

      const result = getEditDetailsLink({
        calEvent: mockCalEvent,
        attendee: attendeeWithDots,
      });

      expect(result).toContain("email=first.last%40sub.example.com");
    });
  });

  describe("URL structure", () => {
    it("should have proper URL structure with booking path", () => {
      const result = getEditDetailsLink({
        calEvent: mockCalEvent,
        attendee: mockAttendee,
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/booking/test-booking-uid-123");
      expect(url.searchParams.get("email")).toBe("attendee@example.com");
    });
  });
});
