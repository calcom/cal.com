import { describe, expect, it, vi } from "vitest";
import WorkflowEmail, { addHTMLStyles } from "./workflow-email";

class TestWorkflowEmail extends WorkflowEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("@calcom/lib/constants", () => ({
  SENDER_NAME: "Cal.com Notifications",
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "noreply@cal.com" };
    }
  },
}));

describe("WorkflowEmail", () => {
  it("stores mail data", () => {
    const data = { to: "user@t.com", subject: "Test", html: "<p>Hello</p>" };
    const email = new TestWorkflowEmail(data);
    expect(email.mailData).toEqual(data);
  });

  describe("getNodeMailerPayload", () => {
    it("returns correct to/from/subject", async () => {
      const email = new TestWorkflowEmail({
        to: "user@t.com",
        subject: "Workflow Test",
        html: "<p>Content</p>",
      });
      const payload = await email.getPayload();
      expect(payload.to).toBe("user@t.com");
      expect(payload.subject).toBe("Workflow Test");
      expect(payload.from).toBe("Cal.com Notifications <noreply@cal.com>");
    });

    it("uses custom sender when provided", async () => {
      const email = new TestWorkflowEmail({
        to: "user@t.com",
        subject: "Test",
        html: "<p>Hi</p>",
        sender: "Custom Sender",
      });
      const payload = await email.getPayload();
      expect(payload.from).toBe("Custom Sender <noreply@cal.com>");
    });

    it("includes replyTo when provided", async () => {
      const email = new TestWorkflowEmail({
        to: "user@t.com",
        subject: "Test",
        html: "<p>Hi</p>",
        replyTo: "reply@t.com",
      });
      const payload = await email.getPayload();
      expect(payload.replyTo).toBe("reply@t.com");
    });

    it("omits replyTo when not provided", async () => {
      const email = new TestWorkflowEmail({
        to: "user@t.com",
        subject: "Test",
        html: "<p>Hi</p>",
      });
      const payload = await email.getPayload();
      expect(payload.replyTo).toBeUndefined();
    });

    it("includes attachments", async () => {
      const attachments = [{ content: "base64data", filename: "file.pdf" }];
      const email = new TestWorkflowEmail({
        to: "user@t.com",
        subject: "Test",
        html: "<p>Hi</p>",
        attachments,
      });
      const payload = await email.getPayload();
      expect(payload.attachments).toEqual(attachments);
    });
  });
});

describe("addHTMLStyles", () => {
  it("returns empty string for undefined input", () => {
    expect(addHTMLStyles(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(addHTMLStyles("")).toBe("");
  });

  it("processes HTML without h6 links unchanged", () => {
    const html = "<p>Hello World</p>";
    const result = addHTMLStyles(html);
    expect(result).toContain("Hello World");
  });

  it("adds styles to links inside h6 elements", () => {
    const html = '<h6><a href="https://example.com">⭐</a></h6>';
    const result = addHTMLStyles(html);
    expect(result).toContain("font-size: 20px");
    expect(result).toContain("text-decoration: none");
  });

  it("does not affect links outside h6 elements", () => {
    const html = '<p><a href="https://example.com">Link</a></p>';
    const result = addHTMLStyles(html);
    expect(result).not.toContain("font-size: 20px");
  });
});
