import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/forgot-password-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/account-verify-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/attendee-verify-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/change-account-email-verify", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

import {
  sendChangeOfEmailVerificationLink,
  sendEmailVerificationCode,
  sendEmailVerificationLink,
  sendPasswordResetEmail,
} from "./auth-email-service";
import AccountVerifyEmail from "./templates/account-verify-email";
import AttendeeVerifyEmail from "./templates/attendee-verify-email";
import ChangeOfEmailVerifyEmail from "./templates/change-account-email-verify";
import ForgotPasswordEmail from "./templates/forgot-password-email";

describe("auth-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendPasswordResetEmail", () => {
    it("creates ForgotPasswordEmail and sends it", async () => {
      const input = {
        language: vi.fn(),
        user: { name: "John", email: "john@test.com" },
        resetLink: "https://cal.com/reset",
      };
      await sendPasswordResetEmail(input);
      expect(ForgotPasswordEmail).toHaveBeenCalledWith(input);
      expect(ForgotPasswordEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendEmailVerificationLink", () => {
    it("creates AccountVerifyEmail and sends it", async () => {
      const input = {
        language: vi.fn(),
        user: { name: "Jane", email: "jane@test.com" },
        verificationEmailLink: "https://cal.com/verify",
      };
      await sendEmailVerificationLink(input);
      expect(AccountVerifyEmail).toHaveBeenCalledWith(input);
      expect(AccountVerifyEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendEmailVerificationCode", () => {
    it("creates AttendeeVerifyEmail and sends it", async () => {
      const input = {
        language: vi.fn(),
        user: { name: "Bob", email: "bob@test.com" },
        verificationEmailCode: "123456",
      };
      await sendEmailVerificationCode(input);
      expect(AttendeeVerifyEmail).toHaveBeenCalledWith(input);
      expect(AttendeeVerifyEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendChangeOfEmailVerificationLink", () => {
    it("creates ChangeOfEmailVerifyEmail and sends it", async () => {
      const input = {
        language: vi.fn(),
        user: { name: "Alice", emailFrom: "old@test.com", emailTo: "new@test.com" },
        verificationEmailLink: "https://cal.com/verify-change",
      };
      await sendChangeOfEmailVerificationLink(input);
      expect(ChangeOfEmailVerifyEmail).toHaveBeenCalledWith(input);
      expect(ChangeOfEmailVerifyEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });
});
