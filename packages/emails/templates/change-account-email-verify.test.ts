import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import ChangeOfEmailVerifyEmail from "./change-account-email-verify";

class TestChangeOfEmailVerifyEmail extends ChangeOfEmailVerifyEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>change-email</html>")),
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

const createInput = () => ({
  language: mockT,
  user: { name: "Jane", emailFrom: "old@test.com", emailTo: "new@test.com" },
  verificationEmailLink: "https://cal.com/verify-change?token=abc",
});

describe("ChangeOfEmailVerifyEmail", () => {
  it("sets name to SEND_ACCOUNT_VERIFY_EMAIL", () => {
    const email = new TestChangeOfEmailVerifyEmail(createInput());
    expect(email.name).toBe("SEND_ACCOUNT_VERIFY_EMAIL");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to new email address", async () => {
      const email = new TestChangeOfEmailVerifyEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("Jane <new@test.com>");
    });

    it("uses change_of_email subject key", async () => {
      const input = createInput();
      const email = new TestChangeOfEmailVerifyEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("change_of_email", { appName: "Cal.com" });
    });

    it("includes html", async () => {
      const email = new TestChangeOfEmailVerifyEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>change-email</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes verification link", () => {
      const email = new TestChangeOfEmailVerifyEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("https://cal.com/verify-change?token=abc");
    });

    it("includes old and new email", () => {
      const email = new TestChangeOfEmailVerifyEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("old@test.com");
      expect(body).toContain("new@test.com");
    });
  });
});
