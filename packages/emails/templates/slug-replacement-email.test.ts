import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import SlugReplacementEmail from "./slug-replacement-email";

class TestSlugReplacementEmail extends SlugReplacementEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>slug-replacement</html>")),
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

describe("SlugReplacementEmail", () => {
  it("stores constructor params", () => {
    const email = new TestSlugReplacementEmail("u@t.com", "John", "Team A", "old-slug", mockT);
    expect(email.email).toBe("u@t.com");
    expect(email.name).toBe("John");
    expect(email.teamName).toBe("Team A");
    expect(email.slug).toBe("old-slug");
  });

  it("allows null teamName", () => {
    const email = new TestSlugReplacementEmail("u@t.com", "John", null, "old-slug", mockT);
    expect(email.teamName).toBeNull();
  });

  describe("getNodeMailerPayload", () => {
    it("sends to correct email", async () => {
      const email = new TestSlugReplacementEmail("u@t.com", "John", "Team A", "old-slug", mockT);
      const payload = await email.getPayload();
      expect(payload.to).toBe("u@t.com");
    });

    it("uses slug in subject", async () => {
      const email = new TestSlugReplacementEmail("u@t.com", "John", "Team A", "old-slug", mockT);
      await email.getPayload();
      expect(mockT).toHaveBeenCalledWith("email_subject_slug_replacement", { slug: "old-slug" });
    });

    it("includes html", async () => {
      const email = new TestSlugReplacementEmail("u@t.com", "John", "Team A", "old-slug", mockT);
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>slug-replacement</html>");
    });
  });

  describe("getTextBody", () => {
    it("calls translation functions with slug", () => {
      const email = new TestSlugReplacementEmail("u@t.com", "John", "Team A", "my-slug", mockT);
      email.getBody();
      expect(mockT).toHaveBeenCalledWith("email_body_slug_replacement_notice", { slug: "my-slug" });
      expect(mockT).toHaveBeenCalledWith("email_body_slug_replacement_suggestion");
    });
  });
});
