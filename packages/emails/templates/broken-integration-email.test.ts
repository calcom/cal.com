import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import BrokenIntegrationEmail from "./broken-integration-email";

class TestBrokenIntegrationEmail extends BrokenIntegrationEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>broken-integration</html>")),
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

describe("BrokenIntegrationEmail", () => {
  it("sets name to SEND_BROKEN_INTEGRATION", () => {
    const evt = createCalEvent();
    const email = new TestBrokenIntegrationEmail(evt, "calendar");
    expect(email.name).toBe("SEND_BROKEN_INTEGRATION");
  });

  it("stores type", () => {
    const evt = createCalEvent();
    const email = new TestBrokenIntegrationEmail(evt, "video");
    expect(email.type).toBe("video");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to organizer", async () => {
      const evt = createCalEvent();
      const email = new TestBrokenIntegrationEmail(evt, "calendar");
      const payload = await email.getPayload();
      expect(payload.to).toBe("org@test.com");
    });

    it("uses [Action Required] prefix in subject", async () => {
      const evt = createCalEvent();
      const email = new TestBrokenIntegrationEmail(evt, "calendar");
      const payload = await email.getPayload();
      expect(String(payload.subject)).toContain("[Action Required]");
    });

    it("includes html", async () => {
      const evt = createCalEvent();
      const email = new TestBrokenIntegrationEmail(evt, "calendar");
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>broken-integration</html>");
    });

    it("includes text body", async () => {
      const evt = createCalEvent();
      const email = new TestBrokenIntegrationEmail(evt, "calendar");
      const payload = await email.getPayload();
      expect(payload.text).toBeDefined();
    });
  });

  describe("getTextBody", () => {
    it("includes description", () => {
      const evt = createCalEvent();
      const email = new TestBrokenIntegrationEmail(evt, "calendar");
      const body = email.getBody();
      expect(body).toContain("mock-description");
    });
  });
});
