import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import BookingRedirectNotification from "./booking-redirect-notification";

class TestBookingRedirectNotification extends BookingRedirectNotification {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>redirect</html>")),
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

const createInput = (action: "add" | "update" | "cancel" = "add") => ({
  language: mockT,
  fromEmail: "from@t.com",
  eventOwner: "Owner",
  toEmail: "to@t.com",
  toName: "Recipient",
  dates: "Jan 1, 2024",
  action,
});

describe("BookingRedirectNotification", () => {
  it("sets name to BOOKING_REDIRECT_NOTIFICATION", () => {
    const email = new TestBookingRedirectNotification(createInput());
    expect(email.name).toBe("BOOKING_REDIRECT_NOTIFICATION");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to recipient", async () => {
      const email = new TestBookingRedirectNotification(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("Recipient <to@t.com>");
    });

    it("uses correct subject key for add action", async () => {
      const email = new TestBookingRedirectNotification(createInput("add"));
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("booking_redirect_email_subject");
    });

    it("uses correct subject key for update action", async () => {
      const email = new TestBookingRedirectNotification(createInput("update"));
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("booking_redirect_updated_email_subject");
    });

    it("uses correct subject key for cancel action", async () => {
      const email = new TestBookingRedirectNotification(createInput("cancel"));
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("booking_redirect_cancelled_email_subject");
    });

    it("includes html", async () => {
      const email = new TestBookingRedirectNotification(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>redirect</html>");
    });

    it("returns empty text", async () => {
      const email = new TestBookingRedirectNotification(createInput());
      const payload = await email.getPayload();
      expect(payload.text).toBe("");
    });
  });
});
