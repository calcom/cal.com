import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import DisabledAppEmail from "./disabled-app-email";

class TestDisabledAppEmail extends DisabledAppEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>disabled-app</html>")),
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

describe("DisabledAppEmail", () => {
  it("stores all constructor parameters", () => {
    const email = new TestDisabledAppEmail("u@t.com", "Zoom", ["video"], mockT, "Meeting", 42);
    expect(email.email).toBe("u@t.com");
    expect(email.appName).toBe("Zoom");
    expect(email.appType).toEqual(["video"]);
    expect(email.title).toBe("Meeting");
    expect(email.eventTypeId).toBe(42);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to user email", async () => {
      const email = new TestDisabledAppEmail("u@t.com", "Zoom", ["video"], mockT);
      const payload = await email.getPayload();
      expect(payload.to).toBe("u@t.com");
    });

    it("uses disabled_app_affects_event_type when title and eventTypeId are set", async () => {
      const email = new TestDisabledAppEmail("u@t.com", "Zoom", ["video"], mockT, "Meeting", 42);
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("disabled_app_affects_event_type", {
        appName: "Zoom",
        eventType: "Meeting",
      });
    });

    it("uses admin_has_disabled when no title/eventTypeId", async () => {
      const email = new TestDisabledAppEmail("u@t.com", "Zoom", ["video"], mockT);
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("admin_has_disabled", { appName: "Zoom" });
    });

    it("includes html", async () => {
      const email = new TestDisabledAppEmail("u@t.com", "Zoom", ["video"], mockT);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>disabled-app</html>");
    });
  });

  describe("getTextBody", () => {
    it("uses payment text for payment apps", () => {
      const email = new TestDisabledAppEmail("u@t.com", "Stripe", ["payment"], mockT, "Event", 1);
      email.getBody();
      expect(mockT).toHaveBeenCalledWith("disable_payment_app", {
        appName: "Stripe",
        title: "Event",
      });
    });

    it("uses video text for video apps", () => {
      const email = new TestDisabledAppEmail("u@t.com", "Zoom", ["video"], mockT);
      email.getBody();
      expect(mockT).toHaveBeenCalledWith("app_disabled_video", { appName: "Zoom" });
    });

    it("uses generic text for other apps", () => {
      const email = new TestDisabledAppEmail("u@t.com", "App", ["calendar"], mockT);
      email.getBody();
      expect(mockT).toHaveBeenCalledWith("app_disabled", { appName: "App" });
    });
  });
});
