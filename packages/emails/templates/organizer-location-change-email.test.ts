import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import OrganizerLocationChangeEmail from "./organizer-location-change-email";

class TestOrganizerLocationChangeEmail extends OrganizerLocationChangeEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../lib/generateIcsFile", () => ({
  default: vi.fn(() => "mock-ics"),
  GenerateIcsRole: { ORGANIZER: "ORGANIZER" },
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>org-location</html>")),
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

const createCalEvent = (): CalendarEvent =>
  ({
    title: "Meeting",
    type: "Consultation",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("A1", "a1@test.com")],
  }) as CalendarEvent;

describe("OrganizerLocationChangeEmail", () => {
  describe("getNodeMailerPayload", () => {
    it("sends to organizer", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerLocationChangeEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.to).toBe("org@test.com");
    });

    it("uses location_changed_event_type_subject for subject", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerLocationChangeEmail({ calEvent: evt });
      await email.getPayload();
      expect(evt.organizer.language.translate).toHaveBeenCalledWith(
        "location_changed_event_type_subject",
        expect.objectContaining({ eventType: "Consultation" })
      );
    });

    it("includes ics and html", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerLocationChangeEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.icalEvent).toBe("mock-ics");
      expect(payload.html).toBe("<html>org-location</html>");
    });

    it("uses EMAIL_FROM_NAME for from", async () => {
      const evt = createCalEvent();
      const email = new TestOrganizerLocationChangeEmail({ calEvent: evt });
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <test@cal.com>");
    });
  });
});
