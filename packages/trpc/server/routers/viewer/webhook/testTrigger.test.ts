import { describe, it, expect } from "vitest";

import { testTriggerHandler } from "./testTrigger.handler";

describe("Webhook Test Trigger - SSRF Protection Integration", () => {
  const mockContext = {}; // Add necessary context properties if needed

  describe("SSRF protection - localhost blocking", () => {
    it("should block localhost URLs in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://localhost:3001/api/internal",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it("should block 127.0.0.1 URLs in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://127.0.0.1:8080/admin",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("SSRF protection - private IP blocking", () => {
    it("should block private IP 192.168.x.x in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://192.168.1.1/admin",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it("should block private IP 10.x.x.x in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://10.0.0.5/api/secrets",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it("should block private IP 172.16.x.x in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://172.16.0.10/metrics",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("SSRF protection - AWS metadata blocking", () => {
    it("should block AWS metadata URL (169.254.169.254)", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://169.254.169.254/latest/meta-data/",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("SSRF protection - protocol validation", () => {
    it("should block file:// protocol", async () => {
      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "file:///etc/passwd",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);
    });

    it("should block ftp:// protocol", async () => {
      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "ftp://example.com/file",
          type: "BOOKING_CREATED",
        },
      });

      expect(result.ok).toBe(false);
    });
  });

  describe("response body protection", () => {
    it("should NOT return response body (no message field with external content)", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Note: This test will try to make a real HTTP request to a public URL
      // In a real integration test, you might want to mock fetch
      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "https://httpbin.org/status/404",
          type: "BOOKING_CREATED",
        },
      });

      // Response should only have 'ok' and 'status', not 'message' with response body
      expect(result).toHaveProperty("ok");
      expect(result).toHaveProperty("status");

      // If there's a message, it should be an error message, not response body
      if (result.message) {
        // Message should be our error, not the external response
        expect(result.message).not.toContain("httpbin");
        expect(result.message).not.toContain("<html");
      }

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("environment-aware validation", () => {
    it("should allow localhost in development environment", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Note: This will try to connect to actual localhost
      // In development, it should at least pass validation (may fail on connection)
      const result = await testTriggerHandler({
        ctx: mockContext,
        input: {
          url: "http://localhost:9999/webhook",
          type: "BOOKING_CREATED",
        },
      });

      // Should not fail with "Invalid webhook URL" error
      // It might fail with connection error, which is expected
      if (!result.ok) {
        expect(result.message).not.toContain("localhost or .local domains are not allowed");
      }

      process.env.NODE_ENV = originalEnv;
    });
  });
});

