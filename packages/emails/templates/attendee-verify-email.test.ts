import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import AttendeeVerifyEmail from "./attendee-verify-email";

class TestAttendeeVerifyEmail extends AttendeeVerifyEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>verify-code</html>")),
}));

vi.mock("@calcom/lib/constants", () => ({
  APP_NAME: "Cal.com",
  COMPANY_NAME: "Cal.com, Inc.",
  EMAIL_FROM_NAME: "Cal.com",
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "noreply@cal.com" };
    }
  },
}));

const mockT = vi.fn((key: string) => key) as unknown as TFunction;

const createInput = (overrides: Record<string, unknown> = {}) => ({
  language: mockT,
  user: { name: "Bob", email: "bob@test.com" },
  verificationEmailCode: "123456",
  ...overrides,
});

describe("AttendeeVerifyEmail", () => {
  it("sets name to SEND_ACCOUNT_VERIFY_EMAIL", () => {
    const email = new TestAttendeeVerifyEmail(createInput());
    expect(email.name).toBe("SEND_ACCOUNT_VERIFY_EMAIL");
  });

  describe("getNodeMailerPayload", () => {
    it("returns correct to/from", async () => {
      const email = new TestAttendeeVerifyEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("Bob <bob@test.com>");
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });

    it("uses branded subject by default", async () => {
      const input = createInput();
      const email = new TestAttendeeVerifyEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("verify_email_subject", { appName: "Cal.com" });
    });

    it("uses no-branding subject when hideLogo is true", async () => {
      const input = createInput({ hideLogo: true });
      const email = new TestAttendeeVerifyEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("verify_email_subject_no_branding");
    });

    it("uses verifying_email subject variant", async () => {
      const input = createInput({ isVerifyingEmail: true });
      const email = new TestAttendeeVerifyEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("verify_email_subject_verifying_email", {
        appName: "Cal.com",
      });
    });

    it("includes html", async () => {
      const email = new TestAttendeeVerifyEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>verify-code</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes verification code", () => {
      const email = new TestAttendeeVerifyEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("123456");
    });

    it("excludes footer when hideLogo is true", () => {
      const freshT = vi.fn((key: string) => key) as unknown as TFunction;
      const input = createInput({ hideLogo: true, language: freshT });
      const email = new TestAttendeeVerifyEmail(input);
      email.getBody();
      expect(freshT).not.toHaveBeenCalledWith("happy_scheduling");
    });

    it("includes footer when hideLogo is false", () => {
      const input = createInput({ hideLogo: false });
      const email = new TestAttendeeVerifyEmail(input);
      email.getBody();
      expect(input.language).toHaveBeenCalledWith("happy_scheduling");
    });
  });
});
