import type { NextRequest } from "next/server";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as mintlifyChatValidation from "@calcom/lib/server/mintlifyChatValidation";

import { POST as topicPOST } from "../topic/route";
import { POST as messagePOST } from "../message/route";

// Mock fetch
global.fetch = vi.fn();

// Polyfill Response.json for test environment
if (!Response.json) {
  Response.json = function (data: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  };
}

describe("Mintlify Chat Proxy Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables
    process.env.MINTLIFY_CHAT_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_CHAT_API_URL = "https://api.mintlify.com";
  });

  afterEach(() => {
    delete process.env.MINTLIFY_CHAT_API_KEY;
    delete process.env.NEXT_PUBLIC_CHAT_API_URL;
  });

  describe("POST /api/mintlify-chat/topic", () => {
    it("should create a topic successfully", async () => {
      const mockTopicId = "test-topic-123";
      
      // Mock Mintlify API response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ topicId: mockTopicId }),
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/topic", {
        method: "POST",
      }) as NextRequest;

      const response = await topicPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topicId).toBe(mockTopicId);
      
      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.mintlify.com/topic",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-api-key",
          },
        }
      );
    });

    it("should handle missing API key", async () => {
      delete process.env.MINTLIFY_CHAT_API_KEY;

      const request = new Request("http://localhost:3000/api/mintlify-chat/topic", {
        method: "POST",
      }) as NextRequest;

      const response = await topicPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      // Generic error message - doesn't leak internal config details
      expect(data.error).toBe("Failed to create topic. Please try again later.");
    });

    it("should handle Mintlify API errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/topic", {
        method: "POST",
      }) as NextRequest;

      const response = await topicPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create topic");
    });

    it("should never expose API key in response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ topicId: "test-topic-123" }),
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/topic", {
        method: "POST",
      }) as NextRequest;

      const response = await topicPOST(request);
      const responseText = await response.text();

      expect(responseText).not.toContain("test-api-key");
      expect(responseText).not.toContain("Bearer");
    });
  });

  describe("POST /api/mintlify-chat/message", () => {
    it("should send a message and stream response", async () => {
      const mockMessage = "What is Cal.com?";
      const mockTopicId = "test-topic-123";
      const mockResponse = "Cal.com is a scheduling platform.";

      // Create a mock ReadableStream
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(mockResponse));
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers({
          "content-type": "text/plain",
          "x-mintlify-base-url": "https://docs.cal.com",
        }),
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: mockMessage,
          topicId: mockTopicId,
        }),
      }) as NextRequest;

      const response = await messagePOST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("x-mintlify-base-url")).toBe("https://docs.cal.com");
      
      // Verify fetch was called with sanitized input
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.mintlify.com/message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-api-key",
          },
          body: JSON.stringify({
            message: mockMessage,
            topicId: mockTopicId,
          }),
        }
      );
    });

    it("should reject invalid JSON payload", async () => {
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: "invalid json",
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("should reject malformed message payload", async () => {
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "",
          topicId: "test-topic",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid message");
    });

    it("should reject oversized messages", async () => {
      const largeMessage = "a".repeat(10001); // Exceeds MAX_MESSAGE_LENGTH
      
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: largeMessage,
          topicId: "test-topic",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("exceeds maximum length");
    });

    it("should reject path traversal in topicId", async () => {
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "test message",
          topicId: "../../../etc/passwd",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Path traversal");
    });

    it("should reject control characters in message", async () => {
      const maliciousMessage = "test\x00message\x01with\x02control\x03chars";
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("sanitized response"));
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers(),
      });
      
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: maliciousMessage,
          topicId: "test-topic-123",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);

      // Should either sanitize (200) or reject with validation error (400)
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        // If sanitized, verify control chars were removed from the proxied request
        const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        const bodyArg = fetchCall?.[1]?.body;
        if (typeof bodyArg === "string") {
          const parsedBody = JSON.parse(bodyArg);
          expect(parsedBody.message).not.toContain("\x00");
          expect(parsedBody.message).not.toContain("\x01");
        }
      }
    });

    it("should reject invalid topicId format", async () => {
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "test message",
          topicId: "invalid topic id with spaces!@#$",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid topicId");
    });

    it("should sanitize response headers", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("response"));
          controller.close();
        },
      });

      const mockHeaders = new Headers({
        "content-type": "text/plain",
        "x-mintlify-base-url": "https://docs.cal.com",
        "x-custom-dangerous-header": "should-not-appear",
        "authorization": "Bearer secret-key",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: mockHeaders,
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "test",
          topicId: "test-topic-123",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);

      // Verify only safe headers are included
      expect(response.headers.get("x-mintlify-base-url")).toBe("https://docs.cal.com");
      expect(response.headers.get("x-custom-dangerous-header")).toBeNull();
      expect(response.headers.get("authorization")).toBeNull();
    });

    it("should never expose API key in any response", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("response text"));
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers(),
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "test",
          topicId: "test-topic-123",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      
      // Verify no API key in response headers
      expect(response.headers.get("authorization")).toBeNull();
      expect(response.headers.get("Authorization")).toBeNull();
      
      // Read response text (for non-stream responses in test env)
      const responseText = await response.text();
      expect(responseText).not.toContain("test-api-key");
      expect(responseText).not.toContain("Bearer");
    });

    it("should handle missing message field", async () => {
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          topicId: "test-topic-123",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid message");
    });

    it("should handle missing topicId field", async () => {
      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "test message",
        }),
      }) as NextRequest;

      const response = await messagePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid topicId");
    });
  });

  describe("Security Tests", () => {
    it("should never leak API key through error messages", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Upstream error with API key: test-api-key")
      );

      const request = new Request("http://localhost:3000/api/mintlify-chat/topic", {
        method: "POST",
      }) as NextRequest;

      const response = await topicPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      // Verify generic error message doesn't contain API key
      expect(JSON.stringify(data)).not.toContain("test-api-key");
      expect(data.error).toBe("Failed to create topic. Please try again later.");
    });

    it("should validate environment variables on every request", async () => {
      const validateSpy = vi.spyOn(mintlifyChatValidation, "validateMintlifyConfig");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ topicId: "test" }),
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/topic", {
        method: "POST",
      }) as NextRequest;

      await topicPOST(request);

      expect(validateSpy).toHaveBeenCalled();
    });

    it("should validate message payload on every request", async () => {
      const validateSpy = vi.spyOn(mintlifyChatValidation, "validateChatMessage");

      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers(),
      });

      const request = new Request("http://localhost:3000/api/mintlify-chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: "test",
          topicId: "test-topic-123",
        }),
      }) as NextRequest;

      await messagePOST(request);

      expect(validateSpy).toHaveBeenCalled();
    });
  });
});

