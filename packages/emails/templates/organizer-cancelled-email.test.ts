import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import OrganizerCancelledEmail from "./organizer-cancelled-email";

class TestOrganizerCancelledEmail extends OrganizerCancelledEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ORGANIZER: "ORGANIZER" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>org-cancelled</html>")),
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
    title: "Cancelled Meeting",
    type: "Meeting",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com")],
    ...overrides,
  }) as CalendarEvent;

describe("OrganizerCancelledEmail", () => {
  describe("getNodeMailerPayload", () => {
    it("sends to organizer by default", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerCancelledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.to).toBe("org@test.com");
    });

    it("sends to teamMember when provided", async () => {
      const evt = createCalEvent();
      const teamMember = createPerson("TM", "tm@test.com");
      const email = new TestOrganizerCancelledEmail({ calEvent: evt, teamMember });
      const payload = await email.getPayload();
      expect(payload.to).toBe("tm@test.com");
    });

    it("uses event_cancelled_subject when not reassigned", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerCancelledEmail({ calEvent: evt });
      await email.getPayload();
      expect(evt.organizer.language.translate).toHaveBeenCalledWith(
        "event_cancelled_subject",
        expect.objectContaining({ title: "Cancelled Meeting" })
      );
    });

    it("uses event_reassigned_subject when reassigned", async () => {
      const evt = createCalEvent();
      const reassigned = { name: "New", email: "new@test.com" };
      const email = new TestOrganizerCancelledEmail({ calEvent: evt, reassigned });
      await email.getPayload();
      expect(evt.organizer.language.translate).toHaveBeenCalledWith(
        "event_reassigned_subject",
        expect.objectContaining({ title: "Cancelled Meeting" })
      );
    });

    it("includes CANCELLED ics", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerCancelledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
    });

    it("renders html", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerCancelledEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>org-cancelled</html>");
    });
  });
});
