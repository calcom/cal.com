import { describe, it, expect, vi, beforeEach } from "vitest";

import { BuildPaymentService, lawpayCredentialKeysSchema } from "./PaymentService";

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("./LawPay", () => ({
  default: vi.fn().mockImplementation(() => ({
    createCharge: vi.fn().mockResolvedValue({ id: "ch_123", status: "AUTHORIZED" }),
    refund: vi.fn().mockResolvedValue({ id: "rf_123" }),
    voidTransaction: vi.fn().mockResolvedValue({ id: "void_123" }),
  })),
}));

describe("LawPay PaymentService", () => {
  const validCredentials = {
    key: {
      client_id: "test_client_id",
      client_secret: "test_client_secret",
      account_id: "test_account_id",
      secret_key: "test_secret_key",
      public_key: "test_public_key",
    },
  };

  describe("lawpayCredentialKeysSchema", () => {
    it("should validate correct credentials", () => {
      const result = lawpayCredentialKeysSchema.safeParse(validCredentials.key);
      expect(result.success).toBe(true);
    });

    it("should reject invalid credentials", () => {
      const result = lawpayCredentialKeysSchema.safeParse({ client_id: "only_one" });
      expect(result.success).toBe(false);
    });
  });

  describe("BuildPaymentService", () => {
    it("should create a payment service instance", () => {
      const service = BuildPaymentService(validCredentials);
      expect(service).toBeDefined();
      expect(service.isSetupAlready()).toBe(true);
    });

    it("should return false for isSetupAlready with invalid credentials", () => {
      const service = BuildPaymentService({ key: {} });
      expect(service.isSetupAlready()).toBe(false);
    });
  });
});
