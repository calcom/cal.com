import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import AttendeeDeclinedEmail from "./attendee-declined-email";

class TestAttendeeDeclinedEmail extends AttendeeDeclinedEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>declined</html>")),
}));

vi.mock("@calcom/lib/getReplyToHeader", () => ({
  getReplyToHeader: vi.fn(() => ({})),
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRichDescription: vi.fn(() => "mock-description"),
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

const createPerson = (name: string, email: string): Person => ({
  name,
  email,
  timeZone: "UTC",
  language: { translate: vi.fn((key: string) => key), locale: "en" },
});

const createCalEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    title: "Declined Meeting",
    type: "Meeting",
    startTime: "2024-06-01T10:00:00Z",
    endTime: "2024-06-01T11:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com")],
    ...overrides,
  }) as CalendarEvent;

describe("AttendeeDeclinedEmail", () => {
  describe("getNodeMailerPayload", () => {
    it("returns correct to/from", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeDeclinedEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.to).toBe("A1 <a1@test.com>");
      expect(payload.from).toBe("Org <test@cal.com>");
    });

    it("uses event_declined_subject for subject", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeDeclinedEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith(
        "event_declined_subject",
        expect.objectContaining({ title: "Declined Meeting" })
      );
    });

    it("uses recurring text for recurring events", async () => {
      const evt = createCalEvent({ recurringEvent: { count: 3, freq: 2, interval: 1 } });
      const attendee = evt.attendees[0];
      const email = new TestAttendeeDeclinedEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith("event_request_declined_recurring");
    });

    it("uses non-recurring text for one-time events", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeDeclinedEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith("event_request_declined");
    });

    it("renders html", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeDeclinedEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>declined</html>");
    });
  });
});
