import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import OrganizationAdminNoSlotsEmail from "./organization-admin-no-slots-email";

class TestOrganizationAdminNoSlotsEmail extends OrganizationAdminNoSlotsEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>no-slots</html>")),
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
  to: { email: "admin@test.com" },
  user: "johndoe",
  slug: "meeting",
  startTime: "2024-01-01T00:00:00Z",
  endTime: "2024-01-31T23:59:59Z",
  teamSlug: "my-team",
  editLink: "https://app.cal.com/settings/availability",
});

describe("OrganizationAdminNoSlotsEmail", () => {
  it("sets name to SEND_ORG_ADMIN_NO_SLOTS_EMAIL_EMAIL", () => {
    const email = new TestOrganizationAdminNoSlotsEmail(createInput());
    expect(email.name).toBe("SEND_ORG_ADMIN_NO_SLOTS_EMAIL_EMAIL");
  });

  it("stores adminNoSlots data", () => {
    const input = createInput();
    const email = new TestOrganizationAdminNoSlotsEmail(input);
    expect(email.adminNoSlots).toEqual(input);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to admin email", async () => {
      const email = new TestOrganizationAdminNoSlotsEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("admin@test.com");
    });

    it("uses org_admin_no_slots|heading for subject", async () => {
      const input = createInput();
      const email = new TestOrganizationAdminNoSlotsEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("org_admin_no_slots|heading", { name: "johndoe" });
    });

    it("includes html", async () => {
      const email = new TestOrganizationAdminNoSlotsEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>no-slots</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes user name in body", () => {
      const email = new TestOrganizationAdminNoSlotsEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("johndoe");
    });

    it("includes slug in body", () => {
      const email = new TestOrganizationAdminNoSlotsEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("meeting");
    });

    it("includes possible reasons", () => {
      const email = new TestOrganizationAdminNoSlotsEmail(createInput());
      const body = email.getBody();
      expect(body).toContain("calendars connected");
      expect(body).toContain("schedules");
    });
  });
});
