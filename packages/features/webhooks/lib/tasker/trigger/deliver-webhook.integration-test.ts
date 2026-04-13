import { Prisma } from "@calcom/prisma/client";
import { describe, expect, it } from "vitest";
import { WebhookHttpError, WebhookSendError } from "../../service/WebhookService";
import {
  extractErrorMessage,
  isRetryableError,
  isRetryableHttpError,
  isRetryablePrismaError,
  isWebhookDeliveryError,
  RETRYABLE_PRISMA_CODES,
  RETRYABLE_STATUS_CODES,
  throwIfUnexpectedErrors,
} from "./deliver-webhook";

describe("deliver-webhook error classification - integration", () => {
  describe("isRetryableHttpError", () => {
    it("should return true for retryable HTTP status codes (5xx, 408, 429)", () => {
      for (const code of [408, 429, 500, 502, 503, 504]) {
        const error = new WebhookHttpError(code, "https://example.com/hook", `HTTP ${code}`);
        expect(isRetryableHttpError(error)).toBe(true);
      }
    });

    it("should return false for non-retryable HTTP status codes (4xx except 408/429)", () => {
      for (const code of [400, 401, 403, 404, 405, 409, 422]) {
        const error = new WebhookHttpError(code, "https://example.com/hook", `HTTP ${code}`);
        expect(isRetryableHttpError(error)).toBe(false);
      }
    });

    it("should return false for a plain Error", () => {
      expect(isRetryableHttpError(new Error("generic"))).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isRetryableHttpError(null)).toBe(false);
      expect(isRetryableHttpError(undefined)).toBe(false);
    });

    it("should return false for HTTP 410 Gone (handled separately via deactivation)", () => {
      const error = new WebhookHttpError(410, "https://example.com/hook", "Gone");
      expect(isRetryableHttpError(error)).toBe(false);
    });
  });

  describe("isRetryablePrismaError", () => {
    it("should return false for PrismaClientValidationError", () => {
      const error = new Prisma.PrismaClientValidationError("invalid query", {
        clientVersion: "5.0.0",
      });
      expect(isRetryablePrismaError(error)).toBe(false);
    });

    it("should return true for PrismaClientInitializationError", () => {
      const error = new Prisma.PrismaClientInitializationError("connection failed", "5.0.0");
      expect(isRetryablePrismaError(error)).toBe(true);
    });

    it("should return true for PrismaClientUnknownRequestError", () => {
      const error = new Prisma.PrismaClientUnknownRequestError("unknown", {
        clientVersion: "5.0.0",
      });
      expect(isRetryablePrismaError(error)).toBe(true);
    });

    it("should return true for PrismaClientKnownRequestError with retryable codes", () => {
      for (const code of RETRYABLE_PRISMA_CODES) {
        const error = new Prisma.PrismaClientKnownRequestError(`Error ${code}`, {
          code,
          clientVersion: "5.0.0",
        });
        expect(isRetryablePrismaError(error)).toBe(true);
      }
    });

    it("should return false for PrismaClientKnownRequestError with non-retryable code", () => {
      const error = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      expect(isRetryablePrismaError(error)).toBe(false);
    });

    it("should return false for a plain Error", () => {
      expect(isRetryablePrismaError(new Error("not prisma"))).toBe(false);
    });
  });

  describe("isRetryableError (composite)", () => {
    it("should return true for retryable HTTP errors", () => {
      expect(isRetryableError(new WebhookHttpError(408, "https://example.com", "timeout"))).toBe(true);
    });

    it("should return true for WebhookSendError (network failures)", () => {
      expect(isRetryableError(new WebhookSendError("https://example.com", "ECONNREFUSED"))).toBe(true);
    });

    it("should return true for retryable Prisma errors", () => {
      const error = new Prisma.PrismaClientInitializationError("init fail", "5.0.0");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return false for non-retryable HTTP errors", () => {
      expect(isRetryableError(new WebhookHttpError(400, "https://example.com", "bad request"))).toBe(false);
    });

    it("should return false for generic errors", () => {
      expect(isRetryableError(new Error("unknown"))).toBe(false);
    });

    it("should return false for non-retryable Prisma errors", () => {
      const error = new Prisma.PrismaClientValidationError("bad query", {
        clientVersion: "5.0.0",
      });
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe("isWebhookDeliveryError", () => {
    it("should return true for WebhookHttpError", () => {
      expect(isWebhookDeliveryError(new WebhookHttpError(500, "https://example.com", "error"))).toBe(true);
    });

    it("should return true for WebhookSendError", () => {
      expect(isWebhookDeliveryError(new WebhookSendError("https://example.com", "send failed"))).toBe(true);
    });

    it("should return false for generic errors", () => {
      expect(isWebhookDeliveryError(new Error("generic"))).toBe(false);
    });

    it("should return false for Prisma errors", () => {
      const error = new Prisma.PrismaClientKnownRequestError("timeout", {
        code: "P1008",
        clientVersion: "5.0.0",
      });
      expect(isWebhookDeliveryError(error)).toBe(false);
    });
  });

  describe("extractErrorMessage", () => {
    it("should extract message from Error instances", () => {
      expect(extractErrorMessage(new Error("test message"))).toBe("test message");
    });

    it("should convert non-Error values to string", () => {
      expect(extractErrorMessage("string error")).toBe("string error");
      expect(extractErrorMessage(42)).toBe("42");
      expect(extractErrorMessage(null)).toBe("null");
    });
  });

  describe("throwIfUnexpectedErrors", () => {
    it("should not throw when there are no errors", () => {
      expect(() => throwIfUnexpectedErrors([], "op-1")).not.toThrow();
    });

    it("should throw aggregated error with all error messages", () => {
      const errors = [new Error("err1"), new Error("err2")];
      expect(() => throwIfUnexpectedErrors(errors, "op-1")).toThrow(
        "Unexpected errors during webhook delivery (operationId=op-1): err1; err2"
      );
    });

    it("should include operationId in the error message", () => {
      const errors = [new Error("single")];
      expect(() => throwIfUnexpectedErrors(errors, "my-op-id")).toThrow("operationId=my-op-id");
    });
  });

  describe("RETRYABLE_STATUS_CODES constant", () => {
    it("should contain exactly the expected set of retryable codes", () => {
      expect(RETRYABLE_STATUS_CODES).toEqual(new Set([408, 429, 500, 502, 503, 504]));
    });
  });

  describe("RETRYABLE_PRISMA_CODES constant", () => {
    it("should contain the expected transient Prisma error codes", () => {
      expect(RETRYABLE_PRISMA_CODES).toEqual(new Set(["P1008", "P2028", "P1017", "P2024", "P2034"]));
    });
  });
});
