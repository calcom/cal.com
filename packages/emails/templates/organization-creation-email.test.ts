import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import OrganizationCreationEmail from "./organization-creation-email";

class TestOrganizationCreationEmail extends OrganizationCreationEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>org-creation</html>")),
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
  to: "admin@test.com",
  ownerNewUsername: "johndoe",
  ownerOldUsername: "john",
  orgName: "My Org",
  orgSlug: "my-org",
  prevLink: "https://cal.com/john",
  newLink: "https://my-org.cal.com/johndoe",
});

describe("OrganizationCreationEmail", () => {
  it("sets name to SEND_ORGANIZATION_CREATION_EMAIL", () => {
    const email = new TestOrganizationCreationEmail(createInput());
    expect(email.name).toBe("SEND_ORGANIZATION_CREATION_EMAIL");
  });

  it("stores organizationCreationEvent", () => {
    const input = createInput();
    const email = new TestOrganizationCreationEmail(input);
    expect(email.organizationCreationEvent).toEqual(input);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to correct email", async () => {
      const email = new TestOrganizationCreationEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.to).toBe("admin@test.com");
    });

    it("uses email_organization_created|subject for subject", async () => {
      const input = createInput();
      const email = new TestOrganizationCreationEmail(input);
      await email.getPayload();
      expect(input.language).toHaveBeenCalledWith("email_organization_created|subject");
    });

    it("includes html", async () => {
      const email = new TestOrganizationCreationEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>org-creation</html>");
    });

    it("returns empty text", async () => {
      const email = new TestOrganizationCreationEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.text).toBe("");
    });

    it("uses EMAIL_FROM_NAME for from", async () => {
      const email = new TestOrganizationCreationEmail(createInput());
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });
  });
});
