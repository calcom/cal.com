import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import ProrationReminderEmail from "./proration-reminder-email";

class TestProrationReminderEmail extends ProrationReminderEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>proration-reminder</html>")),
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

const createParams = () => ({
  user: { name: "Admin", email: "admin@t.com", t: mockT },
  team: { id: 1, name: "Team Y" },
  proration: { monthKey: "2024-02", netSeatIncrease: 3, proratedAmount: 1500 },
  invoiceUrl: "https://billing.cal.com/invoice/456",
});

describe("ProrationReminderEmail", () => {
  it("sets user name to empty when null", () => {
    const params = createParams();
    params.user.name = null as unknown as string;
    const email = new TestProrationReminderEmail(params);
    expect(email.user.name).toBe("");
  });

  it("sets team name to empty when null", () => {
    const params = createParams();
    params.team.name = null as unknown as string;
    const email = new TestProrationReminderEmail(params);
    expect(email.team.name).toBe("");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to user email", async () => {
      const email = new TestProrationReminderEmail(createParams());
      const payload = await email.getPayload();
      expect(payload.to).toBe("admin@t.com");
    });

    it("uses proration_reminder_subject for subject", async () => {
      const email = new TestProrationReminderEmail(createParams());
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("proration_reminder_subject", { teamName: "Team Y" });
    });

    it("includes html", async () => {
      const email = new TestProrationReminderEmail(createParams());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>proration-reminder</html>");
    });
  });

  describe("getTextBody", () => {
    it("formats amount and calls translation", () => {
      const email = new TestProrationReminderEmail(createParams());
      email.getBody();
      expect(mockT).toHaveBeenCalledWith("proration_reminder_text", {
        amount: "15.00",
        teamName: "Team Y",
      });
    });
  });
});
