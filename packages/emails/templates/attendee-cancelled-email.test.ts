import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import AttendeeCancelledEmail from "./attendee-cancelled-email";

class TestAttendeeCancelledEmail extends AttendeeCancelledEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ATTENDEE: "ATTENDEE" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>cancelled</html>")),
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
    title: "Cancelled Meeting",
    type: "Meeting",
    startTime: "2024-02-01T10:00:00Z",
    endTime: "2024-02-01T11:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com")],
    ...overrides,
  }) as CalendarEvent;

describe("AttendeeCancelledEmail", () => {
  it("sets name to SEND_BOOKING_CONFIRMATION (inherited)", () => {
    const evt = createCalEvent();
    const email = new TestAttendeeCancelledEmail(evt, evt.attendees[0]);
    expect(email.name).toBe("SEND_BOOKING_CONFIRMATION");
  });

  describe("getNodeMailerPayload", () => {
    it("returns correct to and from", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeCancelledEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.to).toBe("A1 <a1@test.com>");
      expect(payload.from).toBe("Org <test@cal.com>");
    });

    it("generates subject with event_cancelled_subject key", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeCancelledEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith(
        "event_cancelled_subject",
        expect.objectContaining({ title: "Cancelled Meeting" })
      );
    });

    it("includes CANCELLED ics status", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeCancelledEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
    });

    it("includes html content", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeCancelledEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>cancelled</html>");
    });

    it("uses event_request_cancelled for text body", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeCancelledEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith("event_request_cancelled");
    });
  });
});
