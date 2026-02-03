import { describe, it, expect } from "vitest";

import { ZUpdateInputSchema } from "../types";

describe("ZUpdateInputSchema", () => {
  describe("aiPhoneCallConfig transformation", () => {
    const baseValidInput = {
      id: 1,
    };

    const baseAiPhoneCallConfig = {
      generalPrompt: "Test prompt",
      enabled: true,
      beginMessage: "Hello",
      yourPhoneNumber: "+1234567890",
      numberToCall: "+0987654321",
      templateType: "CUSTOM_TEMPLATE" as const,
    };

    it("should pass validation with valid aiPhoneCallConfig", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: baseAiPhoneCallConfig,
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should set yourPhoneNumber to empty string when falsy", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: {
          ...baseAiPhoneCallConfig,
          yourPhoneNumber: "",
        },
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig?.yourPhoneNumber).toBe("");
      }
    });

    it("should set numberToCall to empty string when falsy", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: {
          ...baseAiPhoneCallConfig,
          numberToCall: "",
        },
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig?.numberToCall).toBe("");
      }
    });

    it("should set guestName to undefined when null", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: {
          ...baseAiPhoneCallConfig,
          guestName: null,
        },
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig?.guestName).toBeUndefined();
      }
    });

    it("should set guestEmail to null when undefined", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: {
          ...baseAiPhoneCallConfig,
          guestEmail: undefined,
        },
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig?.guestEmail).toBeNull();
      }
    });

    it("should set guestCompany to null when undefined", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: {
          ...baseAiPhoneCallConfig,
          guestCompany: undefined,
        },
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig?.guestCompany).toBeNull();
      }
    });

    it("should preserve existing values when provided", () => {
      const input = {
        ...baseValidInput,
        aiPhoneCallConfig: {
          ...baseAiPhoneCallConfig,
          guestName: "John Doe",
          guestEmail: "john@example.com",
          guestCompany: "Acme Inc",
        },
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig?.guestName).toBe("John Doe");
        expect(result.data.aiPhoneCallConfig?.guestEmail).toBe("john@example.com");
        expect(result.data.aiPhoneCallConfig?.guestCompany).toBe("Acme Inc");
      }
    });

    it("should allow undefined aiPhoneCallConfig", () => {
      const input = {
        ...baseValidInput,
      };

      const result = ZUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiPhoneCallConfig).toBeUndefined();
      }
    });
  });
});
