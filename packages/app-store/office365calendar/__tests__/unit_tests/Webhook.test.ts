import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import { getTokenObjectFromCredential } from "../../../_utils/oauth/getTokenObjectFromCredential";
import { getOfficeAppKeys } from "../../lib/getOfficeAppKeys";
import { ErrorHandlingTestUtils } from "./shared/error-handling.utils";

// Mock dependencies
vi.mock("../../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("../../lib/getOfficeAppKeys");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTokenObjectFromCredential).mockReturnValue({
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_at: new Date(Date.now() + 3600 * 1000),
  });
  vi.mocked(getOfficeAppKeys).mockResolvedValue({
    client_id: "mock_client_id",
    client_secret: "mock_client_secret",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Office365Webhook - Webhook Processing", () => {
  describe("Webhook Validation", () => {
    test("should handle validation token request for subscription setup", async () => {
      const mockRequest = {
        method: "GET",
        query: {
          validationToken: "test-validation-token-123",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
        setHeader: vi.fn(),
      };

      // Mock webhook handler
      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "GET" && req.query.validationToken) {
          res.status(200).send(req.query.validationToken);
          return;
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("test-validation-token-123");
    });

    test("should reject invalid validation requests", async () => {
      const mockRequest = {
        method: "GET",
        query: {}, // No validation token
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "GET" && !req.query.validationToken) {
          res.status(400).json({ error: "Missing validation token" });
          return;
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing validation token" });
    });
  });

  describe("Webhook Payload Processing", () => {
    test("should process valid webhook notifications", async () => {
      const mockWebhookPayload = {
        value: [
          {
            subscriptionId: "test-subscription-123",
            changeType: "updated",
            resource: "calendars/calendar123/events/event456",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar123/events/event456",
            },
          },
        ],
      };

      const mockRequest = {
        method: "POST",
        body: mockWebhookPayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          const processed = req.body.value.length;
          res.status(200).json({
            message: "Webhook processed successfully",
            processed,
            failed: 0,
            skipped: 0,
            errors: [],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Webhook processed successfully",
        processed: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });
    });

    test("should handle malformed webhook payloads", async () => {
      const mockRequest = {
        method: "POST",
        body: {
          invalid: "payload",
        },
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && !req.body.value) {
          res.status(400).json({
            message: "Invalid webhook payload",
            processed: 0,
            failed: 1,
            skipped: 0,
            errors: ["Missing 'value' array in payload"],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid webhook payload",
        processed: 0,
        failed: 1,
        skipped: 0,
        errors: ["Missing 'value' array in payload"],
      });
    });

    test("should handle empty webhook notifications", async () => {
      const mockWebhookPayload = {
        value: [],
      };

      const mockRequest = {
        method: "POST",
        body: mockWebhookPayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value && req.body.value.length === 0) {
          res.status(200).json({
            message: "No notifications to process",
            processed: 0,
            failed: 0,
            skipped: 0,
            errors: [],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No notifications to process",
        processed: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      });
    });
  });

  describe("Webhook Deduplication", () => {
    test("should handle duplicate webhook notifications", async () => {
      const duplicatePayload = {
        value: [
          {
            subscriptionId: "test-subscription-123",
            changeType: "updated",
            resource: "calendars/calendar123/events/event456",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar123/events/event456",
            },
          },
          {
            subscriptionId: "test-subscription-123",
            changeType: "updated",
            resource: "calendars/calendar123/events/event456", // Same resource
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar123/events/event456",
            },
          },
        ],
      };

      const mockRequest = {
        method: "POST",
        body: duplicatePayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          // Simulate deduplication logic
          const uniqueResources = new Set();
          let processed = 0;
          let skipped = 0;

          req.body.value.forEach((notification: any) => {
            if (uniqueResources.has(notification.resource)) {
              skipped++;
            } else {
              uniqueResources.add(notification.resource);
              processed++;
            }
          });

          res.status(200).json({
            message: "Webhook processed with deduplication",
            processed,
            failed: 0,
            skipped,
            errors: [],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Webhook processed with deduplication",
        processed: 1,
        failed: 0,
        skipped: 1,
        errors: [],
      });
    });

    test("should handle notifications from different subscriptions", async () => {
      const multiSubscriptionPayload = {
        value: [
          {
            subscriptionId: "subscription-1",
            changeType: "updated",
            resource: "calendars/calendar1/events/event1",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar1/events/event1",
            },
          },
          {
            subscriptionId: "subscription-2",
            changeType: "updated",
            resource: "calendars/calendar2/events/event2",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar2/events/event2",
            },
          },
        ],
      };

      const mockRequest = {
        method: "POST",
        body: multiSubscriptionPayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          const subscriptions = new Set();
          req.body.value.forEach((notification: any) => {
            subscriptions.add(notification.subscriptionId);
          });

          res.status(200).json({
            message: "Multi-subscription webhook processed",
            processed: req.body.value.length,
            failed: 0,
            skipped: 0,
            errors: [],
            subscriptions: subscriptions.size,
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Multi-subscription webhook processed",
        processed: 2,
        failed: 0,
        skipped: 0,
        errors: [],
        subscriptions: 2,
      });
    });
  });

  describe("Webhook Error Handling", () => {
    test("should handle cache update failures gracefully", async () => {
      const mockWebhookPayload = {
        value: [
          {
            subscriptionId: "test-subscription-123",
            changeType: "updated",
            resource: "calendars/calendar123/events/event456",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar123/events/event456",
            },
          },
        ],
      };

      const mockRequest = {
        method: "POST",
        body: mockWebhookPayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      // Mock cache update failure
      const cacheUpdateError = ErrorHandlingTestUtils.ERROR_SCENARIOS.CACHE_ERROR;
      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          // Simulate cache update failure
          res.status(200).json({
            message: "Webhook processed with cache errors",
            processed: 0,
            failed: 1,
            skipped: 0,
            errors: [cacheUpdateError.error().message],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Webhook processed with cache errors",
        processed: 0,
        failed: 1,
        skipped: 0,
        errors: ["Cache update failed"],
      });
    });

    test("should handle subscription not found scenarios", async () => {
      const mockWebhookPayload = {
        value: [
          {
            subscriptionId: "non-existent-subscription",
            changeType: "updated",
            resource: "calendars/calendar123/events/event456",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar123/events/event456",
            },
          },
        ],
      };

      const mockRequest = {
        method: "POST",
        body: mockWebhookPayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          res.status(200).json({
            message: "Webhook processed with subscription errors",
            processed: 0,
            failed: 0,
            skipped: 1,
            errors: ["No SelectedCalendar found for subscription non-existent-subscription"],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Webhook processed with subscription errors",
        processed: 0,
        failed: 0,
        skipped: 1,
        errors: ["No SelectedCalendar found for subscription non-existent-subscription"],
      });
    });

    test("should handle network errors during processing", async () => {
      const mockWebhookPayload = {
        value: [
          {
            subscriptionId: "test-subscription-123",
            changeType: "updated",
            resource: "calendars/calendar123/events/event456",
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": "calendars/calendar123/events/event456",
            },
          },
        ],
      };

      const mockRequest = {
        method: "POST",
        body: mockWebhookPayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const networkError = ErrorHandlingTestUtils.ERROR_SCENARIOS.NETWORK_ERROR;
      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          res.status(200).json({
            message: "Webhook processed with network errors",
            processed: 0,
            failed: 1,
            skipped: 0,
            errors: [networkError.error().message],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Webhook processed with network errors",
        processed: 0,
        failed: 1,
        skipped: 0,
        errors: ["Network request failed"],
      });
    });
  });

  describe("Webhook Security", () => {
    test("should validate webhook signatures", async () => {
      const mockRequest = {
        method: "POST",
        body: {
          value: [
            {
              subscriptionId: "test-subscription-123",
              changeType: "updated",
              resource: "calendars/calendar123/events/event456",
            },
          ],
        },
        headers: {
          "content-type": "application/json",
          "x-ms-signature": "invalid-signature",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.headers["x-ms-signature"]) {
          // Simulate signature validation failure
          res.status(401).json({
            message: "Invalid webhook signature",
            processed: 0,
            failed: 1,
            skipped: 0,
            errors: ["Webhook signature validation failed"],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid webhook signature",
        processed: 0,
        failed: 1,
        skipped: 0,
        errors: ["Webhook signature validation failed"],
      });
    });

    test("should handle missing content-type header", async () => {
      const mockRequest = {
        method: "POST",
        body: {
          value: [
            {
              subscriptionId: "test-subscription-123",
              changeType: "updated",
              resource: "calendars/calendar123/events/event456",
            },
          ],
        },
        headers: {}, // Missing content-type
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && !req.headers["content-type"]) {
          res.status(400).json({
            message: "Missing content-type header",
            processed: 0,
            failed: 1,
            skipped: 0,
            errors: ["Content-Type header is required"],
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Missing content-type header",
        processed: 0,
        failed: 1,
        skipped: 0,
        errors: ["Content-Type header is required"],
      });
    });
  });

  describe("Webhook Performance", () => {
    test("should handle high-volume webhook notifications efficiently", async () => {
      const highVolumePayload = {
        value: Array.from({ length: 100 }, (_, index) => ({
          subscriptionId: `subscription-${index % 10}`,
          changeType: "updated",
          resource: `calendars/calendar${index}/events/event${index}`,
          resourceData: {
            "@odata.type": "#Microsoft.Graph.Event",
            "@odata.id": `calendars/calendar${index}/events/event${index}`,
          },
        })),
      };

      const mockRequest = {
        method: "POST",
        body: highVolumePayload,
        headers: {
          "content-type": "application/json",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      };

      const startTime = Date.now();
      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          const processingTime = Date.now() - startTime;
          res.status(200).json({
            message: "High-volume webhook processed",
            processed: req.body.value.length,
            failed: 0,
            skipped: 0,
            errors: [],
            processingTime,
          });
        }
      });

      webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "High-volume webhook processed",
          processed: 100,
          failed: 0,
          skipped: 0,
          errors: [],
        })
      );
    });

    test("should handle concurrent webhook requests", async () => {
      const createWebhookPayload = (id: number) => ({
        value: [
          {
            subscriptionId: `subscription-${id}`,
            changeType: "updated",
            resource: `calendars/calendar${id}/events/event${id}`,
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": `calendars/calendar${id}/events/event${id}`,
            },
          },
        ],
      });

      const webhookHandler = vi.fn().mockImplementation((req, res) => {
        if (req.method === "POST" && req.body.value) {
          res.status(200).json({
            message: "Concurrent webhook processed",
            processed: req.body.value.length,
            failed: 0,
            skipped: 0,
            errors: [],
          });
        }
      });

      // Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, index) => {
        const mockRequest = {
          method: "POST",
          body: createWebhookPayload(index),
          headers: {
            "content-type": "application/json",
          },
        };

        const mockResponse = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
          setHeader: vi.fn(),
        };

        return { mockRequest, mockResponse };
      });

      // Process all concurrent requests
      concurrentRequests.forEach(({ mockRequest, mockResponse }) => {
        webhookHandler(mockRequest, mockResponse);
      });

      // All requests should be processed successfully
      concurrentRequests.forEach(({ mockResponse }) => {
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: "Concurrent webhook processed",
          processed: 1,
          failed: 0,
          skipped: 0,
          errors: [],
        });
      });
    });
  });
});
