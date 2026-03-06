import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookVersion } from "./interface/IWebhookRepository";
import type { BookingNoShowUpdatedPayload, EventPayloadType, OOOEntryPayloadType } from "./sendPayload";
import sendPayload, {
  createWebhookSignature,
  isDelegationCredentialErrorPayload,
  isEventPayload,
  isNoShowPayload,
  isOOOEntryPayload,
  jsonParse,
  sanitizeAssignmentReasonForWebhook,
  sendGenericWebhookPayload,
} from "./sendPayload";

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

  describe("jsonParse", () => {
    it("should parse valid JSON string", () => {
      expect(jsonParse('{"key":"value"}')).toEqual({ key: "value" });
    });

    it("should return false for invalid JSON", () => {
      expect(jsonParse("not json")).toBe(false);
    });

    it("should parse JSON array", () => {
      expect(jsonParse("[1,2,3]")).toEqual([1, 2, 3]);
    });

    it("should return false for empty string", () => {
      expect(jsonParse("")).toBe(false);
    });
  });

  describe("payload type guards", () => {
    const eventPayload = {
      title: "Test",
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T11:00:00Z",
      organizer: { email: "test@test.com", name: "Test", timeZone: "UTC", language: { locale: "en" } },
      attendees: [],
      type: "test",
    } as unknown as EventPayloadType;

    const oooPayload: OOOEntryPayloadType = {
      oooEntry: {
        id: 1,
        start: "2024-01-01",
        end: "2024-01-02",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        notes: null,
        reason: { emoji: "🏖️" },
        reasonId: 1,
        user: { id: 1, name: "Test", username: "test", timeZone: "UTC", email: "test@test.com" },
        toUser: null,
        uuid: "uuid-1",
      },
    };

    const noShowPayload: BookingNoShowUpdatedPayload = {
      message: "No show",
      bookingUid: "uid-1",
      attendees: [{ email: "test@test.com", noShow: true }],
    };

    const delegationPayload = {
      error: { type: "CalendarAppError", message: "fail" },
      credential: { id: 1, type: "google", appId: "google-calendar" },
      user: { id: 1, email: "test@test.com" },
    };

    it("isOOOEntryPayload should identify OOO payloads", () => {
      expect(isOOOEntryPayload(oooPayload)).toBe(true);
      expect(isOOOEntryPayload(eventPayload)).toBe(false);
    });

    it("isNoShowPayload should identify no-show payloads", () => {
      expect(isNoShowPayload(noShowPayload)).toBe(true);
      expect(isNoShowPayload(eventPayload)).toBe(false);
    });

    it("isDelegationCredentialErrorPayload should identify delegation error payloads", () => {
      expect(isDelegationCredentialErrorPayload(delegationPayload)).toBe(true);
      expect(isDelegationCredentialErrorPayload(eventPayload)).toBe(false);
    });

    it("isEventPayload should return true only for event payloads", () => {
      expect(isEventPayload(eventPayload)).toBe(true);
      expect(isEventPayload(oooPayload)).toBe(false);
      expect(isEventPayload(noShowPayload)).toBe(false);
      expect(isEventPayload(delegationPayload)).toBe(false);
    });
  });

  describe("createWebhookSignature", () => {
    it("should create HMAC signature when secret provided", () => {
      const body = '{"test":"data"}';
      const secret = "my-secret";
      const result = createWebhookSignature({ secret, body });
      const expected = createHmac("sha256", secret).update(body).digest("hex");
      expect(result).toBe(expected);
    });

    it("should return 'no-secret-provided' when no secret", () => {
      expect(createWebhookSignature({ secret: null, body: '{"test":"data"}' })).toBe("no-secret-provided");
    });

    it("should return 'no-secret-provided' when secret is undefined", () => {
      expect(createWebhookSignature({ body: '{"test":"data"}' })).toBe("no-secret-provided");
    });
  });

  describe("sendGenericWebhookPayload", () => {
    it("should send payload with default JSON structure", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendGenericWebhookPayload({
        secretKey: "secret",
        triggerEvent: "FORM_SUBMITTED",
        createdAt: "2024-01-01T00:00:00Z",
        webhook,
        data: { formId: "form-1", name: "Test Form" },
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.triggerEvent).toBe("FORM_SUBMITTED");
      expect(body.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(body.payload).toEqual({ formId: "form-1", name: "Test Form" });
    });

    it("should apply template when provided", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: '{"event":"{{triggerEvent}}","form":"{{payload.formId}}"}',
        version: WebhookVersion.V_2021_10_20,
      };

      await sendGenericWebhookPayload({
        secretKey: null,
        triggerEvent: "FORM_SUBMITTED",
        createdAt: "2024-01-01T00:00:00Z",
        webhook,
        data: { formId: "form-1" },
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.event).toBe("FORM_SUBMITTED");
      expect(body.form).toBe("form-1");
    });

    it("should merge rootData into default payload", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendGenericWebhookPayload({
        secretKey: null,
        triggerEvent: "FORM_SUBMITTED",
        createdAt: "2024-01-01T00:00:00Z",
        webhook,
        data: { formId: "form-1" },
        rootData: { customField: "custom-value" },
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.customField).toBe("custom-value");
      expect(body.triggerEvent).toBe("FORM_SUBMITTED");
    });

    it("should use form-urlencoded when template is not valid JSON", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: "event={{triggerEvent}}&form={{payload.formId}}",
        version: WebhookVersion.V_2021_10_20,
      };

      await sendGenericWebhookPayload({
        secretKey: null,
        triggerEvent: "FORM_SUBMITTED",
        createdAt: "2024-01-01T00:00:00Z",
        webhook,
        data: { formId: "form-1" },
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });
  });

  describe("_sendPayload error handling", () => {
    it("should throw when subscriberUrl is missing", async () => {
      const webhook = {
        subscriberUrl: "",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await expect(
        sendPayload("secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
          title: "Test",
          startTime: "2024-01-01T10:00:00Z",
          endTime: "2024-01-01T11:00:00Z",
          organizer: {
            email: "test@test.com",
            name: "Test",
            timeZone: "UTC",
            language: { locale: "en" },
          },
          attendees: [],
          type: "test",
          description: "",
        } as unknown as Parameters<typeof sendPayload>[4])
      ).rejects.toThrow("Missing required elements to send webhook payload.");
    });
  });

  describe("content type detection", () => {
    it("should use application/json when no template provided", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      await sendPayload("secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "test@test.com",
          name: "Test",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test",
        description: "",
      } as unknown as Parameters<typeof sendPayload>[4]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should use application/x-www-form-urlencoded when template is not valid JSON", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: null,
        payloadTemplate: "event={{triggerEvent}}",
        version: WebhookVersion.V_2021_10_20,
      };

      await sendPayload("secret", "BOOKING_CREATED", new Date().toISOString(), webhook, {
        title: "Test",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "test@test.com",
          name: "Test",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [],
        type: "test",
        description: "",
      } as unknown as Parameters<typeof sendPayload>[4]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });
  });

  describe("OOO payload handling", () => {
    it("should send OOO payload without Zapier processing", async () => {
      const webhook = {
        subscriberUrl: "https://example.com/webhook",
        appId: "zapier",
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      };

      const oooData = {
        oooEntry: {
          id: 1,
          start: "2024-01-01",
          end: "2024-01-02",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          notes: null,
          reason: { emoji: "🏖️" },
          reasonId: 1,
          user: { id: 1, name: "Test", username: "test", timeZone: "UTC", email: "test@test.com" },
          toUser: null,
          uuid: "uuid-1",
        },
      } as Parameters<typeof sendPayload>[4];

      await sendPayload("secret", "OOO_CREATED", "2024-01-01T00:00:00Z", webhook, oooData);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.triggerEvent).toBe("OOO_CREATED");
      expect(body.payload.oooEntry.id).toBe(1);
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
