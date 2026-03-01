import { describe, expect, it, vi } from "vitest";
import DelegationCredentialDisabledEmail from "./delegation-credential-disabled-email";

class TestDelegationCredentialDisabledEmail extends DelegationCredentialDisabledEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
  public async getEmailHtml() {
    return await this.getHtml();
  }
}

vi.mock("@calcom/lib/constants", () => ({
  EMAIL_FROM_NAME: "Cal.com",
  WEBAPP_URL: "https://app.cal.com",
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "noreply@cal.com" };
    }
  },
}));

describe("DelegationCredentialDisabledEmail", () => {
  it("sets name to DELEGATION_CREDENTIAL_DISABLED", () => {
    const email = new TestDelegationCredentialDisabledEmail({
      recipientEmail: "u@t.com",
      calendarAppName: "Google Calendar",
      conferencingAppName: "Google Meet",
    });
    expect(email.name).toBe("DELEGATION_CREDENTIAL_DISABLED");
  });

  it("stores constructor params", () => {
    const email = new TestDelegationCredentialDisabledEmail({
      recipientEmail: "u@t.com",
      recipientName: "John",
      calendarAppName: "Google Calendar",
      conferencingAppName: "Google Meet",
    });
    expect(email.recipientEmail).toBe("u@t.com");
    expect(email.recipientName).toBe("John");
    expect(email.calendarAppName).toBe("Google Calendar");
    expect(email.conferencingAppName).toBe("Google Meet");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to recipient email", async () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const payload = await email.getPayload();
      expect(payload.to).toBe("u@t.com");
    });

    it("uses calendar app name in subject", async () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const payload = await email.getPayload();
      expect(payload.subject).toBe("You might need to connect your Google Calendar");
    });
  });

  describe("getHtml", () => {
    it("includes recipient name when provided", async () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        recipientName: "John",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const html = await email.getEmailHtml();
      expect(html).toContain("Hi John,");
    });

    it("uses Hello when no recipient name", async () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const html = await email.getEmailHtml();
      expect(html).toContain("Hello,");
    });

    it("includes calendar and conferencing app names", async () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const html = await email.getEmailHtml();
      expect(html).toContain("Google Calendar");
      expect(html).toContain("Google Meet");
    });

    it("includes settings links", async () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const html = await email.getEmailHtml();
      expect(html).toContain("https://app.cal.com/settings/my-account/calendars");
      expect(html).toContain("https://app.cal.com/settings/my-account/conferencing");
    });
  });

  describe("getTextBody", () => {
    it("includes calendar and conferencing app names", () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const body = email.getBody();
      expect(body).toContain("Google Calendar");
      expect(body).toContain("Google Meet");
    });

    it("includes settings URLs", () => {
      const email = new TestDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      const body = email.getBody();
      expect(body).toContain("https://app.cal.com/settings/my-account/calendars");
      expect(body).toContain("https://app.cal.com/settings/my-account/conferencing");
    });
  });
});
