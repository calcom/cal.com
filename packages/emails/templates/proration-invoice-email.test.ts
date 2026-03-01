import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import ProrationInvoiceEmail from "./proration-invoice-email";

class TestProrationInvoiceEmail extends ProrationInvoiceEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>proration-invoice</html>")),
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
  team: { id: 1, name: "Team X" },
  proration: { monthKey: "2024-01", netSeatIncrease: 5, proratedAmount: 2500 },
  invoiceUrl: "https://billing.cal.com/invoice/123",
  isAutoCharge: false,
});

describe("ProrationInvoiceEmail", () => {
  it("sets user name to empty when null", () => {
    const params = createParams();
    params.user.name = null as unknown as string;
    const email = new TestProrationInvoiceEmail(params);
    expect(email.user.name).toBe("");
  });

  it("sets team name to empty when null", () => {
    const params = createParams();
    params.team.name = null as unknown as string;
    const email = new TestProrationInvoiceEmail(params);
    expect(email.team.name).toBe("");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to user email", async () => {
      const email = new TestProrationInvoiceEmail(createParams());
      const payload = await email.getPayload();
      expect(payload.to).toBe("admin@t.com");
    });

    it("formats amount correctly in subject", async () => {
      const email = new TestProrationInvoiceEmail(createParams());
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("proration_invoice_subject", {
        teamName: "Team X",
        amount: "25.00",
      });
    });

    it("includes html", async () => {
      const email = new TestProrationInvoiceEmail(createParams());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>proration-invoice</html>");
    });
  });

  describe("getTextBody", () => {
    it("calls translation with formatted amount and seats", () => {
      const email = new TestProrationInvoiceEmail(createParams());
      email.getBody();
      expect(mockT).toHaveBeenCalledWith("proration_invoice_text", {
        amount: "25.00",
        seats: 5,
        teamName: "Team X",
      });
    });
  });
});
