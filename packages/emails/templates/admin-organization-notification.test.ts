import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import AdminOrganizationNotification from "./admin-organization-notification";

class TestAdminOrganizationNotification extends AdminOrganizationNotification {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>org-notification</html>")),
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
  t: mockT,
  instanceAdmins: [{ email: "admin1@test.com" }, { email: "admin2@test.com" }],
  ownerEmail: "owner@test.com",
  orgSlug: "test-org",
  webappIPAddress: "192.168.1.1",
});

describe("AdminOrganizationNotification", () => {
  it("sets name to SEND_ADMIN_ORG_NOTIFICATION", () => {
    const email = new TestAdminOrganizationNotification(createInput());
    expect(email.name).toBe("SEND_ADMIN_ORG_NOTIFICATION");
  });

  describe("getNodeMailerPayload", () => {
    it("sends to all instance admins", async () => {
      const email = new TestAdminOrganizationNotification(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("admin1@test.com,admin2@test.com");
    });

    it("uses EMAIL_FROM_NAME for from", async () => {
      const email = new TestAdminOrganizationNotification(createInput());
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });

    it("uses admin_org_notification_email_subject for subject", async () => {
      const input = createInput();
      const email = new TestAdminOrganizationNotification(input);
      await email.getPayload();
      expect(input.t).toHaveBeenCalledWith("admin_org_notification_email_subject");
    });

    it("includes html", async () => {
      const email = new TestAdminOrganizationNotification(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>org-notification</html>");
    });
  });

  describe("getTextBody", () => {
    it("calls hi_admin and notification title", () => {
      const input = createInput();
      const email = new TestAdminOrganizationNotification(input);
      email.getBody();
      expect(input.t).toHaveBeenCalledWith("hi_admin");
      expect(input.t).toHaveBeenCalledWith("admin_org_notification_email_title");
    });
  });
});
