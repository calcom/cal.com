import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

class TestOrganizerScheduledEmail extends OrganizerScheduledEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ORGANIZER: "ORGANIZER" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>org-scheduled</html>")),
}));

vi.mock("@calcom/lib/getReplyToHeader", () => ({
  getReplyToHeader: vi.fn(() => ({})),
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRichDescription: vi.fn(() => "mock-description"),
}));

vi.mock("@calcom/lib/constants", () => ({
  EMAIL_FROM_NAME: "Cal.com",
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
    title: "Team Meeting",
    type: "Meeting",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    organizer: createPerson("Organizer", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com")],
    ...overrides,
  }) as CalendarEvent;

describe("OrganizerScheduledEmail", () => {
  it("sets name to SEND_BOOKING_CONFIRMATION", () => {
    const evt = createCalEvent();
    const email = new TestOrganizerScheduledEmail({ calEvent: evt });
    expect(email.name).toBe("SEND_BOOKING_CONFIRMATION");
  });

  it("sets translation from organizer language", () => {
    const evt = createCalEvent();
    const email = new TestOrganizerScheduledEmail({ calEvent: evt });
    expect(email.t).toBe(evt.organizer.language.translate);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to organizer by default", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.to).toBe("org@test.com");
    });

    it("sends to teamMember when provided", async () => {
      const evt = createCalEvent();
      const teamMember = createPerson("Team", "team@test.com");
      const email = new TestOrganizerScheduledEmail({ calEvent: evt, teamMember });
      const payload = await email.getPayload();
      expect(payload.to).toBe("team@test.com");
    });

    it("uses EMAIL_FROM_NAME for from", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <test@cal.com>");
    });

    it("prepends new_attendee for newSeat", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt, newSeat: true });
      const payload = await email.getPayload();
      expect(payload.subject).toContain("Team Meeting");
    });

    it("includes title as subject", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.subject).toBe("Team Meeting");
    });

    it("includes ics and html", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
      expect(payload.html).toBe("<html>org-scheduled</html>");
    });
  });

  describe("getTextBody", () => {
    it("uses recurring key for recurring events", () => {
      const evt = createCalEvent({ recurringEvent: { count: 5, freq: 2, interval: 1 } });
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      email["getTextBody"]();
      expect(evt.organizer.language.translate).toHaveBeenCalledWith("new_event_scheduled_recurring");
    });

    it("uses non-recurring key by default", () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      email["getTextBody"]();
      expect(evt.organizer.language.translate).toHaveBeenCalledWith("new_event_scheduled");
    });
  });

  describe("getTimezone and getLocale", () => {
    it("returns organizer timezone", () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      expect(email["getTimezone"]()).toBe("UTC");
    });

    it("returns organizer locale", () => {
      const evt = createCalEvent();
      const email = new TestOrganizerScheduledEmail({ calEvent: evt });
      expect(email["getLocale"]()).toBe("en");
    });
  });
});
