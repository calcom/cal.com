import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import ForgotPasswordEmail from "./forgot-password-email";

class TestForgotPasswordEmail extends ForgotPasswordEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>forgot-password</html>")),
}));

vi.mock("@calcom/lib/constants", () => ({
  APP_NAME: "Cal.com",
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
  user: { name: "John", email: "john@test.com" },
  resetLink: "https://cal.com/reset?token=abc123",
});

describe("ForgotPasswordEmail", () => {
  it("sets name to SEND_PASSWORD_RESET_EMAIL", () => {
    const email = new TestForgotPasswordEmail(createInput());
    expect(email.name).toBe("SEND_PASSWORD_RESET_EMAIL");
  });

  describe("getNodeMailerPayload", () => {
    it("returns correct to/from", async () => {
      const email = new TestForgotPasswordEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("John <john@test.com>");
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });

    it("calls language function for subject", async () => {
      const input = createInput();
      const email = new TestForgotPasswordEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("reset_password_subject", { appName: "Cal.com" });
    });

    it("includes html content", async () => {
      const email = new TestForgotPasswordEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>forgot-password</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes reset link", () => {
      const email = new TestForgotPasswordEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("https://cal.com/reset?token=abc123");
    });

    it("calls translation functions", () => {
      const input = createInput();
      const email = new TestForgotPasswordEmail(input);
      email.getBody();
      expect(input.language).toHaveBeenCalledWith("someone_requested_password_reset");
      expect(input.language).toHaveBeenCalledWith("password_reset_instructions");
    });
  });
});
