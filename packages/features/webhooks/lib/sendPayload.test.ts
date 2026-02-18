import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookVersion } from "./interface/IWebhookRepository";
import type { EventPayloadType } from "./sendPayload";
import sendPayload, { sanitizeAssignmentReasonForWebhook } from "./sendPayload";

describe("sendPayload", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe("X-Cal-Webhook-Version header", () => {
    it("should include X-Cal-Webhook-Version header with the webhook version", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendPayload("test-secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test Booking",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test-event",
        description: "",
      } as unknown as Parameters<typeof sendPayload>[4]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://example.com/webhook");
      expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", "2021-10-20");
    });

    it("should include X-Cal-Signature-256 header alongside version header", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendPayload("test-secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test Booking",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test-event",
        description: "",
      } as unknown as Parameters<typeof sendPayload>[4]);

      const [, options] = mockFetch.mock.calls[0];

      expect(options.headers).toHaveProperty("X-Cal-Signature-256");
      expect(options.headers).toHaveProperty("X-Cal-Webhook-Version");
      expect(options.headers).toHaveProperty("Content-Type", "application/json");
    });

    it("should send correct version for different webhook versions", async () => {
      // Test with the current version
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendPayload("test-secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "test@example.com",
          name: "Test",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test",
        description: "",
      } as unknown as Parameters<typeof sendPayload>[4]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["X-Cal-Webhook-Version"]).toBe("2021-10-20");
    });
  });

  describe("sanitizeAssignmentReasonForWebhook", () => {
    const basePayload = {
      title: "Test Booking",
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T11:00:00Z",
      organizer: {
        email: "organizer@example.com",
        name: "Organizer",
        timeZone: "UTC",
        language: { locale: "en" },
      },
      attendees: [],
      type: "test-event",
    } as unknown as EventPayloadType;

    it("should preserve string assignmentReason", () => {
      const data = { ...basePayload, assignmentReason: "Salesforce contact owner: user@example.com" };
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toBe("Salesforce contact owner: user@example.com");
    });

    it("should preserve array assignmentReason with reasonEnum and reasonString", () => {
      const reasons = [{ reasonEnum: "ROUTED", reasonString: "Language: English" }];
      const data = { ...basePayload, assignmentReason: reasons };
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toEqual(reasons);
    });

    it("should preserve null assignmentReason", () => {
      const data = { ...basePayload, assignmentReason: null };
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toBeNull();
    });

    it("should preserve undefined assignmentReason", () => {
      const data = { ...basePayload };
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toBeUndefined();
    });

    it("should strip CalendarEvent email format { category, details }", () => {
      const data = {
        ...basePayload,
        assignmentReason: { category: "routed", details: "Language: English" },
      } as unknown as EventPayloadType;
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toBeUndefined();
    });

    it("should strip CalendarEvent email format with null details", () => {
      const data = {
        ...basePayload,
        assignmentReason: { category: "reassigned", details: null },
      } as unknown as EventPayloadType;
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toBeUndefined();
    });

    it("should not strip other fields when stripping assignmentReason", () => {
      const data = {
        ...basePayload,
        bookingId: 123,
        status: "ACCEPTED",
        assignmentReason: { category: "routed", details: "test" },
      } as unknown as EventPayloadType;
      const result = sanitizeAssignmentReasonForWebhook(data);
      expect(result.assignmentReason).toBeUndefined();
      expect(result.bookingId).toBe(123);
      expect(result.status).toBe("ACCEPTED");
      expect(result.title).toBe("Test Booking");
    });
  });

  describe("sendPayload strips CalendarEvent assignmentReason format", () => {
    it("should not include { category, details } format in webhook payload", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendPayload("test-secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test Booking",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test-event",
        description: "",
        assignmentReason: { category: "routed", details: "Language: English" },
      } as unknown as Parameters<typeof sendPayload>[4]);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.payload.assignmentReason).toBeUndefined();
    });

    it("should preserve array assignmentReason format in webhook payload", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      const reasons = [{ reasonEnum: "ROUTED", reasonString: "Language: English" }];
      await sendPayload("test-secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test Booking",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test-event",
        description: "",
        assignmentReason: reasons,
      } as unknown as Parameters<typeof sendPayload>[4]);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.payload.assignmentReason).toEqual(reasons);
    });
  });
});
