import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import CreditBalanceLimitReachedEmail from "./credit-balance-limit-reached-email";

class TestCreditBalanceLimitReachedEmail extends CreditBalanceLimitReachedEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>credit-limit</html>")),
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

describe("CreditBalanceLimitReachedEmail", () => {
  it("sets user name to empty string when null", () => {
    const email = new TestCreditBalanceLimitReachedEmail({
      user: { id: 1, name: null, email: "u@t.com", t: mockT },
    });
    expect(email.user.name).toBe("");
  });

  it("sets team name to empty string when null", () => {
    const email = new TestCreditBalanceLimitReachedEmail({
      user: { id: 1, name: "John", email: "u@t.com", t: mockT },
      team: { id: 1, name: null },
    });
    expect(email.team?.name).toBe("");
  });

  it("sets team to undefined when not provided", () => {
    const email = new TestCreditBalanceLimitReachedEmail({
      user: { id: 1, name: "John", email: "u@t.com", t: mockT },
    });
    expect(email.team).toBeUndefined();
  });

  describe("getNodeMailerPayload", () => {
    it("sends to user email", async () => {
      const email = new TestCreditBalanceLimitReachedEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
      });
      const payload = await email.getPayload();
      expect(payload.to).toBe("john@t.com");
    });

    it("uses team subject when team exists", async () => {
      const email = new TestCreditBalanceLimitReachedEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
        team: { id: 1, name: "Team A" },
      });
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("action_required_out_of_credits", { teamName: "Team A" });
    });

    it("uses user subject when no team", async () => {
      const email = new TestCreditBalanceLimitReachedEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
      });
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("action_required_user_out_of_credits");
    });

    it("includes html", async () => {
      const email = new TestCreditBalanceLimitReachedEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
      });
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>credit-limit</html>");
    });
  });

  describe("getTextBody", () => {
    it("returns out of credits message", () => {
      const email = new TestCreditBalanceLimitReachedEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
      });
      expect(email.getBody()).toContain("ran out of credits");
    });
  });
});
