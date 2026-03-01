import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import AttendeeLocationChangeEmail from "./attendee-location-change-email";

class TestAttendeeLocationChangeEmail extends AttendeeLocationChangeEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ATTENDEE: "ATTENDEE" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>location-change</html>")),
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
    title: "Meeting",
    type: "Consultation",
    startTime: "2024-05-01T10:00:00Z",
    endTime: "2024-05-01T11:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com")],
    ...overrides,
  }) as CalendarEvent;

describe("AttendeeLocationChangeEmail", () => {
  describe("getNodeMailerPayload", () => {
    it("returns correct to/from", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeLocationChangeEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.to).toBe("A1 <a1@test.com>");
      expect(payload.from).toBe("Org <test@cal.com>");
    });

    it("uses location_changed_event_type_subject for subject", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeLocationChangeEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith(
        "location_changed_event_type_subject",
        expect.objectContaining({ eventType: "Consultation" })
      );
    });

    it("uses team name in subject when team exists", async () => {
      const evt = createCalEvent({ team: { name: "Team A", members: [], id: 1 } });
      const attendee = evt.attendees[0];
      const email = new TestAttendeeLocationChangeEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith(
        "location_changed_event_type_subject",
        expect.objectContaining({ name: "Team A" })
      );
    });

    it("uses organizer name when no team", async () => {
      const evt = createCalEvent();
      const attendee = evt.attendees[0];
      const email = new TestAttendeeLocationChangeEmail(evt, attendee);
      await email.getPayload();
      expect(attendee.language.translate).toHaveBeenCalledWith(
        "location_changed_event_type_subject",
        expect.objectContaining({ name: "Org" })
      );
    });

    it("includes ics and html", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeLocationChangeEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
      expect(payload.html).toBe("<html>location-change</html>");
    });
  });
});
