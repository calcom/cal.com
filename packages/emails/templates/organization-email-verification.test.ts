import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import OrganizationEmailVerification from "./organization-email-verification";

class TestOrganizationEmailVerification extends OrganizationEmailVerification {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>org-verify</html>")),
}));

vi.mock("@calcom/lib/constants", () => ({
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
  user: { email: "org@test.com" },
  code: "987654",
});

describe("OrganizationEmailVerification", () => {
  it("sets name to SEND_ORG_ACCOUNT_VERIFY_EMAIL", () => {
    const email = new TestOrganizationEmailVerification(createInput());
    expect(email.name).toBe("SEND_ORG_ACCOUNT_VERIFY_EMAIL");
  });

  it("stores orgVerifyInput", () => {
    const input = createInput();
    const email = new TestOrganizationEmailVerification(input);
    expect(email.orgVerifyInput).toEqual(input);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to user email", async () => {
      const email = new TestOrganizationEmailVerification(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("org@test.com");
    });

    it("uses verify_email_organization for subject", async () => {
      const input = createInput();
      const email = new TestOrganizationEmailVerification(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("verify_email_organization");
    });

    it("includes html", async () => {
      const email = new TestOrganizationEmailVerification(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>org-verify</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes verification code", () => {
      const email = new TestOrganizationEmailVerification(createInput());
      const body = email.getBody();
      expect(body).toContain("987654");
    });

    it("includes Code label", () => {
      const email = new TestOrganizationEmailVerification(createInput());
      const body = email.getBody();
      expect(body).toContain("<b>Code:</b>");
    });
  });
});
