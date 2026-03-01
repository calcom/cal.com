import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

class TestAttendeeScheduledEmail extends AttendeeScheduledEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ATTENDEE: "ATTENDEE" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>mock</html>")),
}));

vi.mock("@calcom/lib/getReplyToHeader", () => ({
  getReplyToHeader: vi.fn(() => ({})),
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRichDescription: vi.fn(() => "mock-description"),
  getVideoCallUrlFromCalEvent: vi.fn(() => ""),
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "test@cal.com" };
    }
    getFormattedRecipientTime() {
      return "10:00 AM";
    }
  },
}));

const createMockPerson = (name: string, email: string): Person => ({
  name,
  email,
  timeZone: "UTC",
  language: {
    translate: vi.fn((key: string) => key),
    locale: "en",
  },
});

const createMockCalEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    title: "Test Event",
    type: "Test Type",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    organizer: createMockPerson("Organizer", "organizer@example.com"),
    attendees: [
      createMockPerson("Attendee1", "a1@example.com"),
      createMockPerson("Attendee2", "a2@example.com"),
    ],
    ...overrides,
  }) as CalendarEvent;

describe("AttendeeScheduledEmail", () => {
  it("sets name to SEND_BOOKING_CONFIRMATION", () => {
    const calEvent = createMockCalEvent();
    const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
    expect(email.name).toBe("SEND_BOOKING_CONFIRMATION");
  });

  it("sets attendee and translation from attendee language", () => {
    const calEvent = createMockCalEvent();
    const attendee = calEvent.attendees[0];
    const email = new TestAttendeeScheduledEmail(calEvent, attendee);
    expect(email.attendee).toBe(attendee);
    expect(email.t).toBe(attendee.language.translate);
  });

  describe("getNodeMailerPayload", () => {
    it("returns correct to/from/subject fields", async () => {
      const calEvent = createMockCalEvent();
      const attendee = calEvent.attendees[0];
      const email = new TestAttendeeScheduledEmail(calEvent, attendee);
      const payload = await email.getPayload();

      expect(payload.to).toBe("Attendee1 <a1@example.com>");
      expect(payload.from).toBe("Organizer <test@cal.com>");
      expect(payload.subject).toBe("Test Event");
    });

    it("includes icalEvent in payload", async () => {
      const calEvent = createMockCalEvent();
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
    });

    it("includes html and text in payload", async () => {
      const calEvent = createMockCalEvent();
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>mock</html>");
      expect(typeof payload.text).toBe("string");
    });
  });

  describe("getTextBody", () => {
    it("uses recurring event key when recurringEvent count exists", () => {
      const calEvent = createMockCalEvent({ recurringEvent: { count: 5, freq: 2, interval: 1 } });
      const attendee = calEvent.attendees[0];
      const email = new TestAttendeeScheduledEmail(calEvent, attendee);
      const text = email["getTextBody"]();
      expect(attendee.language.translate).toHaveBeenCalledWith("your_event_has_been_scheduled_recurring");
    });

    it("uses non-recurring key when no recurringEvent", () => {
      const calEvent = createMockCalEvent();
      const attendee = calEvent.attendees[0];
      const email = new TestAttendeeScheduledEmail(calEvent, attendee);
      email["getTextBody"]();
      expect(attendee.language.translate).toHaveBeenCalledWith("your_event_has_been_scheduled");
    });
  });

  describe("getTimezone and getLocale", () => {
    it("returns attendee timezone", () => {
      const calEvent = createMockCalEvent();
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      expect(email["getTimezone"]()).toBe("UTC");
    });

    it("returns attendee locale", () => {
      const calEvent = createMockCalEvent();
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      expect(email["getLocale"]()).toBe("en");
    });
  });

  describe("seated events privacy", () => {
    it("filters attendees when seatsShowAttendees is false", () => {
      const calEvent = createMockCalEvent({
        seatsPerTimeSlot: 5,
        seatsShowAttendees: false,
      });
      const recipient = calEvent.attendees[0];
      const email = new TestAttendeeScheduledEmail(calEvent, recipient);
      expect(email.calEvent.attendees).toHaveLength(1);
      expect(email.calEvent.attendees[0].email).toBe(recipient.email);
    });

    it("includes all attendees when seatsShowAttendees is true", () => {
      const calEvent = createMockCalEvent({
        seatsPerTimeSlot: 5,
        seatsShowAttendees: true,
      });
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      expect(email.calEvent.attendees).toHaveLength(2);
    });

    it("defaults to filtering when seatsShowAttendees is null", () => {
      const calEvent = createMockCalEvent({
        seatsPerTimeSlot: 5,
        seatsShowAttendees: null,
      });
      const recipient = calEvent.attendees[0];
      const email = new TestAttendeeScheduledEmail(calEvent, recipient);
      expect(email.calEvent.attendees).toHaveLength(1);
    });

    it("does not filter for non-seated events", () => {
      const calEvent = createMockCalEvent({ seatsPerTimeSlot: null });
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      expect(email.calEvent.attendees).toHaveLength(2);
    });

    it("uses explicit showAttendees parameter over seatsShowAttendees", () => {
      const calEvent = createMockCalEvent({
        seatsPerTimeSlot: 5,
        seatsShowAttendees: false,
      });
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0], true);
      expect(email.calEvent.attendees).toHaveLength(2);
    });

    it("does not mutate original event when filtering", () => {
      const calEvent = createMockCalEvent({
        seatsPerTimeSlot: 5,
        seatsShowAttendees: false,
      });
      const original = calEvent.attendees.length;
      const email = new TestAttendeeScheduledEmail(calEvent, calEvent.attendees[0]);
      expect(calEvent.attendees).toHaveLength(original);
      expect(email.calEvent).not.toBe(calEvent);
    });
  });
});
