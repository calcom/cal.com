import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import AttendeeRescheduledEmail from "./attendee-rescheduled-email";

class TestAttendeeRescheduledEmail extends AttendeeRescheduledEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ATTENDEE: "ATTENDEE" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>rescheduled</html>")),
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

const createCalEvent = (): CalendarEvent =>
  ({
    title: "Rescheduled Meeting",
    type: "Meeting",
    startTime: "2024-03-01T14:00:00Z",
    endTime: "2024-03-01T15:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com"), createPerson("A2", "a2@test.com")],
  }) as CalendarEvent;

describe("AttendeeRescheduledEmail", () => {
  describe("getNodeMailerPayload", () => {
    it("returns correct to/from fields", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRescheduledEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.to).toBe("A1 <a1@test.com>");
      expect(payload.from).toBe("Org <test@cal.com>");
    });

    it("uses event_type_has_been_rescheduled_on_time_date for subject", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeRescheduledEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith(
        "event_type_has_been_rescheduled_on_time_date",
        expect.objectContaining({ title: "Rescheduled Meeting" })
      );
    });

    it("includes ics with CONFIRMED status", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRescheduledEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
    });

    it("renders html content", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRescheduledEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>rescheduled</html>");
    });
  });
});
