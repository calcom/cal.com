import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import CreditBalanceLowWarningEmail from "./credit-balance-low-warning-email";

class TestCreditBalanceLowWarningEmail extends CreditBalanceLowWarningEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>credit-low</html>")),
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

describe("CreditBalanceLowWarningEmail", () => {
  it("sets user name to empty string when null", () => {
    const email = new TestCreditBalanceLowWarningEmail({
      user: { id: 1, name: null, email: "u@t.com", t: mockT },
      balance: 10,
    });
    expect(email.user.name).toBe("");
  });

  it("preserves user name when provided", () => {
    const email = new TestCreditBalanceLowWarningEmail({
      user: { id: 1, name: "John", email: "u@t.com", t: mockT },
      balance: 10,
    });
    expect(email.user.name).toBe("John");
  });

  it("sets team name to empty string when null", () => {
    const email = new TestCreditBalanceLowWarningEmail({
      user: { id: 1, name: "John", email: "u@t.com", t: mockT },
      balance: 10,
      team: { id: 1, name: null },
    });
    expect(email.team?.name).toBe("");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to user email", async () => {
      const email = new TestCreditBalanceLowWarningEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
        balance: 5,
      });
      const payload = await email.getPayload();
      expect(payload.to).toBe("john@t.com");
    });

    it("uses team subject when team exists", async () => {
      const email = new TestCreditBalanceLowWarningEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
        balance: 5,
        team: { id: 1, name: "Team A" },
      });
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("team_credits_low_warning", { teamName: "Team A" });
    });

    it("uses user subject when no team", async () => {
      const email = new TestCreditBalanceLowWarningEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
        balance: 5,
      });
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("user_credits_low_warning");
    });

    it("includes html", async () => {
      const email = new TestCreditBalanceLowWarningEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
        balance: 5,
      });
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>credit-low</html>");
    });
  });

  describe("getTextBody", () => {
    it("returns low credits message", () => {
      const email = new TestCreditBalanceLowWarningEmail({
        user: { id: 1, name: "John", email: "john@t.com", t: mockT },
        balance: 5,
      });
      expect(email.getBody()).toContain("running low on credits");
    });
  });
});
