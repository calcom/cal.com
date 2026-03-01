import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import AccountVerifyEmail from "./account-verify-email";

class TestAccountVerifyEmail extends AccountVerifyEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>verify</html>")),
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

const createInput = (isSecondary = false) => ({
  language: mockT,
  user: { name: "Jane", email: "jane@test.com" },
  verificationEmailLink: "https://cal.com/verify?token=xyz",
  isSecondaryEmailVerification: isSecondary,
});

describe("AccountVerifyEmail", () => {
  it("sets name to SEND_ACCOUNT_VERIFY_EMAIL", () => {
    const email = new TestAccountVerifyEmail(createInput());
    expect(email.name).toBe("SEND_ACCOUNT_VERIFY_EMAIL");
  });

  describe("getNodeMailerPayload", () => {
    it("returns correct to/from", async () => {
      const email = new TestAccountVerifyEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("Jane <jane@test.com>");
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });

    it("uses verify_email_subject for primary verification", async () => {
      const input = createInput(false);
      const email = new TestAccountVerifyEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("verify_email_subject", { appName: "Cal.com" });
    });

    it("uses verify_email_email_header for secondary verification", async () => {
      const input = createInput(true);
      const email = new TestAccountVerifyEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("verify_email_email_header", { appName: "Cal.com" });
    });

    it("includes html", async () => {
      const email = new TestAccountVerifyEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>verify</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes verification link", () => {
      const email = new TestAccountVerifyEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("https://cal.com/verify?token=xyz");
    });

    it("calls translation functions", () => {
      const input = createInput();
      const email = new TestAccountVerifyEmail(input);
      email.getBody();
      expect(input.language).toHaveBeenCalledWith("verify_email_email_header");
      expect(input.language).toHaveBeenCalledWith("verify_email_email_link_text");
    });
  });
});
