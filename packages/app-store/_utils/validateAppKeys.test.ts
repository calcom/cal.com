import { describe, expect, it } from "vitest";
import { shouldEnableApp } from "./validateAppKeys";

describe("shouldEnableApp", () => {
  describe("Apps without key schemas", () => {
    it("should return true for apps that don't require keys", () => {
      // Use a dirName that doesn't have a schema (e.g., a non-existent app)
      const result = shouldEnableApp("non-existent-app", null);
      expect(result).toBe(true);
    });

    it("should return true even if keys are null for apps without schemas", () => {
      const result = shouldEnableApp("non-existent-app", null);
      expect(result).toBe(true);
    });

    it("should return true even if keys are empty object for apps without schemas", () => {
      const result = shouldEnableApp("non-existent-app", {});
      expect(result).toBe(true);
    });
  });

  describe("Apps with key schemas", () => {
    it("should return false when keys are null", () => {
      // dailyvideo requires api_key and has scale_plan with default
      const result = shouldEnableApp("dailyvideo", null);
      expect(result).toBe(false);
    });

    it("should return false when keys are undefined", () => {
      const result = shouldEnableApp("dailyvideo", undefined);
      expect(result).toBe(false);
    });

    it("should return false when keys is an empty object", () => {
      // Empty object doesn't have required api_key field
      const result = shouldEnableApp("dailyvideo", {});
      expect(result).toBe(false);
    });

    it("should return false when keys is an array", () => {
      const result = shouldEnableApp("dailyvideo", [] as any);
      expect(result).toBe(false);
    });

    it("should return false when keys is a string", () => {
      const result = shouldEnableApp("dailyvideo", "invalid" as any);
      expect(result).toBe(false);
    });

    it("should return false when keys is a number", () => {
      const result = shouldEnableApp("dailyvideo", 123 as any);
      expect(result).toBe(false);
    });

    it("should return false when required keys are missing", () => {
      // Missing required api_key field
      const result = shouldEnableApp("dailyvideo", {
        scale_plan: "true",
      });
      expect(result).toBe(false);
    });

    it("should return false when required keys are empty strings", () => {
      // api_key is empty string, which violates .min(1)
      const result = shouldEnableApp("dailyvideo", {
        api_key: "",
        scale_plan: "false",
      });
      expect(result).toBe(false);
    });

    it("should return true when all required keys are present and valid", () => {
      const result = shouldEnableApp("dailyvideo", {
        api_key: "valid-api-key",
        scale_plan: "false",
      });
      expect(result).toBe(true);
    });

    it("should return true when required keys are present and optional fields use defaults", () => {
      // scale_plan has a default, so we can omit it
      const result = shouldEnableApp("dailyvideo", {
        api_key: "valid-api-key",
      });
      expect(result).toBe(true);
    });

    it("should return false when keys have wrong types", () => {
      // api_key should be string, not number
      const result = shouldEnableApp("dailyvideo", {
        api_key: 123 as any,
        scale_plan: "false",
      });
      expect(result).toBe(false);
    });
  });

  describe("Apps with multiple required fields", () => {
    it("should return false when any required field is missing", () => {
      // vital requires mode, region, api_key, and webhook_secret
      const result = shouldEnableApp("vital", {
        mode: "sandbox",
        region: "us",
        api_key: "test-key",
        // Missing webhook_secret
      });
      expect(result).toBe(false);
    });

    it("should return true when all required fields are present", () => {
      const result = shouldEnableApp("vital", {
        mode: "sandbox",
        region: "us",
        api_key: "test-key",
        webhook_secret: "test-secret",
      });
      expect(result).toBe(true);
    });

    it("should return false when any required field is empty", () => {
      const result = shouldEnableApp("vital", {
        mode: "",
        region: "us",
        api_key: "test-key",
        webhook_secret: "test-secret",
      });
      expect(result).toBe(false);
    });
  });

  describe("Apps with empty key schemas (user-configured apps like PayPal, GTM)", () => {
    // These apps have `appKeysSchema = z.object({})` - they don't need server-side keys
    // Users configure them after installation, so they should always be enabled

    it("should return true for PayPal when keys are null", () => {
      const result = shouldEnableApp("paypal", null);
      expect(result).toBe(true);
    });

    it("should return true for PayPal when keys are undefined", () => {
      const result = shouldEnableApp("paypal", undefined);
      expect(result).toBe(true);
    });

    it("should return true for PayPal when keys are empty object", () => {
      const result = shouldEnableApp("paypal", {});
      expect(result).toBe(true);
    });

    it("should return true for GTM when keys are null", () => {
      const result = shouldEnableApp("gtm", null);
      expect(result).toBe(true);
    });

    it("should return true for GTM when keys are undefined", () => {
      const result = shouldEnableApp("gtm", undefined);
      expect(result).toBe(true);
    });

    it("should return true for GA4 when keys are null", () => {
      const result = shouldEnableApp("ga4", null);
      expect(result).toBe(true);
    });
  });
});
