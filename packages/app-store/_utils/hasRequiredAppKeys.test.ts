import { describe, expect, it } from "vitest";

import { hasRequiredAppKeys } from "./hasRequiredAppKeys";

describe("hasRequiredAppKeys", () => {
  describe("Apps without key schemas", () => {
    it("should return true for apps that don't require keys", async () => {
      // Use a dirName that doesn't have a schema (e.g., a non-existent app)
      const result = await hasRequiredAppKeys("non-existent-app", null);
      expect(result).toBe(true);
    });

    it("should return true even if keys are null for apps without schemas", async () => {
      const result = await hasRequiredAppKeys("non-existent-app", null);
      expect(result).toBe(true);
    });

    it("should return true even if keys are empty object for apps without schemas", async () => {
      const result = await hasRequiredAppKeys("non-existent-app", {});
      expect(result).toBe(true);
    });
  });

  describe("Apps with key schemas", () => {
    it("should return false when keys are null", async () => {
      // dailyvideo requires api_key and has scale_plan with default
      const result = await hasRequiredAppKeys("dailyvideo", null);
      expect(result).toBe(false);
    });

    it("should return false when keys are undefined", async () => {
      const result = await hasRequiredAppKeys("dailyvideo", undefined as any);
      expect(result).toBe(false);
    });

    it("should return false when keys is an empty object", async () => {
      // Empty object doesn't have required api_key field
      const result = await hasRequiredAppKeys("dailyvideo", {});
      expect(result).toBe(false);
    });

    it("should return false when keys is an array", async () => {
      const result = await hasRequiredAppKeys("dailyvideo", [] as any);
      expect(result).toBe(false);
    });

    it("should return false when keys is a string", async () => {
      const result = await hasRequiredAppKeys("dailyvideo", "invalid" as any);
      expect(result).toBe(false);
    });

    it("should return false when keys is a number", async () => {
      const result = await hasRequiredAppKeys("dailyvideo", 123 as any);
      expect(result).toBe(false);
    });

    it("should return false when required keys are missing", async () => {
      // Missing required api_key field
      const result = await hasRequiredAppKeys("dailyvideo", {
        scale_plan: "true",
      });
      expect(result).toBe(false);
    });

    it("should return false when required keys are empty strings", async () => {
      // api_key is empty string, which violates .min(1)
      const result = await hasRequiredAppKeys("dailyvideo", {
        api_key: "",
        scale_plan: "false",
      });
      expect(result).toBe(false);
    });

    it("should return true when all required keys are present and valid", async () => {
      const result = await hasRequiredAppKeys("dailyvideo", {
        api_key: "valid-api-key",
        scale_plan: "false",
      });
      expect(result).toBe(true);
    });

    it("should return true when required keys are present and optional fields use defaults", async () => {
      // scale_plan has a default, so we can omit it
      const result = await hasRequiredAppKeys("dailyvideo", {
        api_key: "valid-api-key",
      });
      expect(result).toBe(true);
    });

    it("should return false when keys have wrong types", async () => {
      // api_key should be string, not number
      const result = await hasRequiredAppKeys("dailyvideo", {
        api_key: 123 as any,
        scale_plan: "false",
      });
      expect(result).toBe(false);
    });
  });

  describe("Apps with multiple required fields", () => {
    it("should return false when any required field is missing", async () => {
      // vital requires mode, region, api_key, and webhook_secret
      const result = await hasRequiredAppKeys("vital", {
        mode: "sandbox",
        region: "us",
        api_key: "test-key",
        // Missing webhook_secret
      });
      expect(result).toBe(false);
    });

    it("should return true when all required fields are present", async () => {
      const result = await hasRequiredAppKeys("vital", {
        mode: "sandbox",
        region: "us",
        api_key: "test-key",
        webhook_secret: "test-secret",
      });
      expect(result).toBe(true);
    });

    it("should return false when any required field is empty", async () => {
      const result = await hasRequiredAppKeys("vital", {
        mode: "",
        region: "us",
        api_key: "test-key",
        webhook_secret: "test-secret",
      });
      expect(result).toBe(false);
    });
  });
});
