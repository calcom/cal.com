import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import AttendeeRequestEmail from "./attendee-request-email";

class TestAttendeeRequestEmail extends AttendeeRequestEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>request</html>")),
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
    title: "Request Meeting",
    type: "Consultation",
    startTime: "2024-04-01T10:00:00Z",
    endTime: "2024-04-01T11:00:00Z",
    organizer: createPerson("Org", "org@test.com"),
    attendees: [createPerson("Requester", "req@test.com")],
  }) as CalendarEvent;

describe("AttendeeRequestEmail", () => {
  describe("getNodeMailerPayload", () => {
    it("sends to all attendees", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRequestEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.to).toBe("req@test.com");
    });

    it("uses EMAIL_FROM_NAME for from field", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRequestEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <test@cal.com>");
    });

    it("uses booking_submitted_subject for subject", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRequestEmail(evt, evt.attendees[0]);
      await email.getPayload();
      expect(evt.attendees[0].language.translate).toHaveBeenCalledWith(
        "booking_submitted_subject",
        expect.objectContaining({ title: "Request Meeting" })
      );
    });

    it("renders html content", async () => {
      const evt = createCalEvent();
      const email = new TestAttendeeRequestEmail(evt, evt.attendees[0]);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>request</html>");
    });
  });
});
