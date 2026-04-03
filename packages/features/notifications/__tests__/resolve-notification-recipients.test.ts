import { describe, expect, it } from "vitest";
import {
  type BookingForNotificationRecipients,
  resolveNotificationRecipients,
} from "../resolve-notification-recipients";

function makeBooking(
  overrides: Partial<BookingForNotificationRecipients> = {}
): BookingForNotificationRecipients {
  return {
    userId: 1,
    attendees: [],
    hosts: [],
    ...overrides,
  };
}

describe("resolveNotificationRecipients", () => {
  describe("basic recipient resolution", () => {
    it("returns only organizer for individual event with no hosts or Cal-user attendees", () => {
      const result = resolveNotificationRecipients(makeBooking(), new Map());

      expect(result).toEqual([{ userId: 1, reason: "organizer" }]);
    });

    it("returns organizer + hosts for team event", () => {
      const booking = makeBooking({
        hosts: [{ userId: 10 }, { userId: 20 }],
      });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 10, reason: "host" },
        { userId: 20, reason: "host" },
      ]);
    });

    it("includes attendee who is a Cal user", () => {
      const booking = makeBooking({
        attendees: [{ email: "caluser@example.com" }],
      });
      const attendeeUserIds = new Map([["caluser@example.com", 50]]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 50, reason: "attendee" },
      ]);
    });

    it("excludes external attendee not in attendeeUserIds map", () => {
      const booking = makeBooking({
        attendees: [{ email: "external@guest.com" }],
      });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([{ userId: 1, reason: "organizer" }]);
    });
  });

  describe("deduplication", () => {
    it("deduplicates when organizer is also a host", () => {
      const booking = makeBooking({
        userId: 1,
        hosts: [{ userId: 1 }, { userId: 20 }],
      });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 20, reason: "host" },
      ]);
    });

    it("deduplicates when organizer is also a Cal-user attendee", () => {
      const booking = makeBooking({
        userId: 1,
        attendees: [{ email: "organizer@cal.com" }],
      });
      const attendeeUserIds = new Map([["organizer@cal.com", 1]]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([{ userId: 1, reason: "organizer" }]);
    });

    it("deduplicates when host is also a Cal-user attendee (first-seen wins)", () => {
      const booking = makeBooking({
        userId: 1,
        hosts: [{ userId: 10 }],
        attendees: [{ email: "host@cal.com" }],
      });
      const attendeeUserIds = new Map([["host@cal.com", 10]]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 10, reason: "host" },
      ]);
    });
  });

  describe("edge cases", () => {
    it("handles null organizer userId", () => {
      const booking = makeBooking({
        userId: null,
        hosts: [{ userId: 10 }],
      });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([{ userId: 10, reason: "host" }]);
    });

    it("handles empty hosts array", () => {
      const booking = makeBooking({ hosts: [] });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([{ userId: 1, reason: "organizer" }]);
    });

    it("handles empty attendees array", () => {
      const booking = makeBooking({
        hosts: [{ userId: 10 }],
        attendees: [],
      });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 10, reason: "host" },
      ]);
    });

    it("handles empty attendeeUserIds map (no attendees are Cal users)", () => {
      const booking = makeBooking({
        attendees: [{ email: "a@guest.com" }, { email: "b@guest.com" }],
      });

      const result = resolveNotificationRecipients(booking, new Map());

      expect(result).toEqual([{ userId: 1, reason: "organizer" }]);
    });

    it("includes multiple Cal-user attendees", () => {
      const booking = makeBooking({
        attendees: [{ email: "user1@cal.com" }, { email: "external@guest.com" }, { email: "user2@cal.com" }],
      });
      const attendeeUserIds = new Map([
        ["user1@cal.com", 50],
        ["user2@cal.com", 60],
      ]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 50, reason: "attendee" },
        { userId: 60, reason: "attendee" },
      ]);
    });
  });

  describe("email normalization", () => {
    it("resolves attendee when booking email has different casing than map key", () => {
      const booking = makeBooking({
        attendees: [{ email: "Test@Cal.com" }],
      });
      const attendeeUserIds = new Map([["test@cal.com", 50]]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 50, reason: "attendee" },
      ]);
    });

    it("resolves attendee with all-uppercase email", () => {
      const booking = makeBooking({
        attendees: [{ email: "USER@EXAMPLE.COM" }],
      });
      const attendeeUserIds = new Map([["user@example.com", 70]]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 70, reason: "attendee" },
      ]);
    });
  });

  describe("comprehensive scenario", () => {
    it("resolves full team booking with mixed attendees", () => {
      const booking = makeBooking({
        userId: 1,
        hosts: [{ userId: 10 }, { userId: 20 }, { userId: 30 }],
        attendees: [
          { email: "caluser1@example.com" },
          { email: "external1@guest.com" },
          { email: "CalUser2@Example.com" },
          { email: "external2@guest.com" },
          { email: "host-also-attendee@cal.com" },
        ],
      });
      const attendeeUserIds = new Map([
        ["caluser1@example.com", 50],
        ["caluser2@example.com", 60],
        ["host-also-attendee@cal.com", 10],
      ]);

      const result = resolveNotificationRecipients(booking, attendeeUserIds);

      expect(result).toEqual([
        { userId: 1, reason: "organizer" },
        { userId: 10, reason: "host" },
        { userId: 20, reason: "host" },
        { userId: 30, reason: "host" },
        { userId: 50, reason: "attendee" },
        { userId: 60, reason: "attendee" },
      ]);
      // host userId 10 is NOT duplicated despite being in attendeeUserIds
      expect(result.filter((r) => r.userId === 10)).toHaveLength(1);
    });
  });
});
