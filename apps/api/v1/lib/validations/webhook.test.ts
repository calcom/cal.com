import { describe, expect, it } from "vitest";
import { z } from "zod";

import { schemaWebhookCreateParams, schemaWebhookEditBodyParams } from "./webhook";

describe("Webhook URL Security Validation", () => {
  describe("Valid URLs", () => {
    it("should accept valid HTTPS URLs", () => {
      const validData = {
        subscriberUrl: "https://api.example.com/webhook",
        eventTriggers: ["BOOKING_CREATED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(validData)).not.toThrow();
    });

    it("should accept valid HTTP URLs", () => {
      const validData = {
        subscriberUrl: "http://webhook.example.com/callback",
        eventTriggers: ["BOOKING_CANCELLED"],
        active: false,
      };
      
      expect(() => schemaWebhookCreateParams.parse(validData)).not.toThrow();
    });

    it("should accept URLs with query parameters", () => {
      const validData = {
        subscriberUrl: "https://api.example.com/webhook?token=abc123",
        eventTriggers: ["MEETING_ENDED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(validData)).not.toThrow();
    });

    it("should accept URLs with paths", () => {
      const validData = {
        subscriberUrl: "https://example.com/api/v1/webhooks/cal",
        eventTriggers: ["BOOKING_RESCHEDULED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(validData)).not.toThrow();
    });
  });

  describe("Blocked URLs - Security Threats", () => {
    it("should reject localhost URLs", () => {
      const invalidData = {
        subscriberUrl: "https://localhost:3000/webhook",
        eventTriggers: ["BOOKING_CREATED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject 127.0.0.1 URLs", () => {
      const invalidData = {
        subscriberUrl: "http://127.0.0.1:8080/callback",
        eventTriggers: ["BOOKING_CANCELLED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject private network URLs", () => {
      const invalidData = {
        subscriberUrl: "https://192.168.1.100/webhook",
        eventTriggers: ["MEETING_ENDED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject URLs with credentials", () => {
      const invalidData = {
        subscriberUrl: "https://user:pass@example.com/webhook",
        eventTriggers: ["BOOKING_RESCHEDULED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject javascript: URLs", () => {
      const invalidData = {
        subscriberUrl: "javascript:alert('xss')",
        eventTriggers: ["BOOKING_CREATED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject data: URLs", () => {
      const invalidData = {
        subscriberUrl: "data:text/html,<script>alert('xss')</script>",
        eventTriggers: ["BOOKING_CANCELLED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject file: URLs", () => {
      const invalidData = {
        subscriberUrl: "file:///etc/passwd",
        eventTriggers: ["MEETING_ENDED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should reject invalid URL formats", () => {
      const invalidData = {
        subscriberUrl: "not-a-url",
        eventTriggers: ["BOOKING_RESCHEDULED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });
  });

  describe("Edit Webhook Validation", () => {
    it("should validate subscriberUrl when provided in edit", () => {
      const validEditData = {
        subscriberUrl: "https://new-webhook.example.com/callback",
        eventTriggers: ["BOOKING_CREATED"],
        active: true,
      };
      
      expect(() => schemaWebhookEditBodyParams.parse(validEditData)).not.toThrow();
    });

    it("should reject unsafe URLs in edit", () => {
      const invalidEditData = {
        subscriberUrl: "https://localhost:3000/webhook",
        eventTriggers: ["BOOKING_CANCELLED"],
        active: true,
      };
      
      expect(() => schemaWebhookEditBodyParams.parse(invalidEditData)).toThrow();
    });

    it("should allow edit without subscriberUrl", () => {
      const editDataWithoutUrl = {
        eventTriggers: ["MEETING_ENDED"],
        active: false,
      };
      
      expect(() => schemaWebhookEditBodyParams.parse(editDataWithoutUrl)).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle case-insensitive blocked hosts", () => {
      const invalidData = {
        subscriberUrl: "https://LOCALHOST:3000/webhook",
        eventTriggers: ["BOOKING_CREATED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(invalidData)).toThrow();
    });

    it("should handle URLs with ports", () => {
      const validData = {
        subscriberUrl: "https://api.example.com:8443/webhook",
        eventTriggers: ["BOOKING_CANCELLED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(validData)).not.toThrow();
    });

    it("should handle complex query parameters", () => {
      const validData = {
        subscriberUrl: "https://webhook.example.com/callback?event=booking&id=123&timestamp=2024-01-01",
        eventTriggers: ["MEETING_ENDED"],
        active: true,
      };
      
      expect(() => schemaWebhookCreateParams.parse(validData)).not.toThrow();
    });
  });
}); 