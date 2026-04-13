import { describe, expect, it } from "vitest";
import {
  sendWorkflowEmails,
  ZSendWorkflowEmailsSchema,
  ZSendWorkflowEmailsSchemaEager,
} from "./sendWorkflowEmails";

describe("sendWorkflowEmails - integration", () => {
  describe("schema validation (eager mode)", () => {
    it("should validate a well-formed eager payload", () => {
      const payload = {
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Hello</p>",
      };

      const result = ZSendWorkflowEmailsSchemaEager.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should validate eager payload with all optional fields", () => {
      const payload = {
        to: ["a@example.com", "b@example.com"],
        subject: "Full Test",
        html: "<p>Full</p>",
        replyTo: "reply@example.com",
        sender: "Cal.com",
        attachments: [{ content: "base64data", filename: "file.pdf" }],
        organizationId: 123,
      };

      const result = ZSendWorkflowEmailsSchemaEager.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject eager payload missing required 'to' field", () => {
      const payload = {
        subject: "No To",
        html: "<p>Missing</p>",
      };

      const result = ZSendWorkflowEmailsSchemaEager.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject eager payload missing required 'subject' field", () => {
      const payload = {
        to: ["test@example.com"],
        html: "<p>No subject</p>",
      };

      const result = ZSendWorkflowEmailsSchemaEager.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject eager payload missing required 'html' field", () => {
      const payload = {
        to: ["test@example.com"],
        subject: "No HTML",
      };

      const result = ZSendWorkflowEmailsSchemaEager.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("schema validation (lazy mode)", () => {
    it("should validate a well-formed lazy payload via the union schema", () => {
      const payload = {
        bookingUid: "abc-123",
        workflowReminderId: 42,
      };

      const result = ZSendWorkflowEmailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should validate lazy payload with platform fields", () => {
      const payload = {
        bookingUid: "abc-123",
        workflowReminderId: 42,
        platformClientId: "client-1",
        platformRescheduleUrl: "https://example.com/reschedule",
        platformCancelUrl: "https://example.com/cancel",
        platformBookingUrl: "https://example.com/booking",
      };

      const result = ZSendWorkflowEmailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("sendWorkflowEmails function (lazy mode)", () => {
    it("should throw 'Booking not found' when bookingUid does not exist in DB", async () => {
      const payload = JSON.stringify({
        bookingUid: "nonexistent-uid-for-workflow-test",
        workflowReminderId: 99999,
      });

      await expect(sendWorkflowEmails(payload)).rejects.toThrow("Booking not found");
    });

    it("should throw when payload is invalid JSON", async () => {
      await expect(sendWorkflowEmails("not-valid-json")).rejects.toThrow();
    });

    it("should throw when payload does not match either schema variant", async () => {
      const payload = JSON.stringify({ unrelated: true });

      await expect(sendWorkflowEmails(payload)).rejects.toThrow();
    });
  });

  describe("union schema discrimination", () => {
    it("should accept eager format (to + subject + html)", () => {
      const result = ZSendWorkflowEmailsSchema.safeParse({
        to: ["x@test.com"],
        subject: "s",
        html: "<p>h</p>",
      });
      expect(result.success).toBe(true);
    });

    it("should accept lazy format (bookingUid + workflowReminderId)", () => {
      const result = ZSendWorkflowEmailsSchema.safeParse({
        bookingUid: "uid",
        workflowReminderId: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should reject payload that matches neither variant", () => {
      const result = ZSendWorkflowEmailsSchema.safeParse({
        randomField: "value",
      });
      expect(result.success).toBe(false);
    });
  });
});
