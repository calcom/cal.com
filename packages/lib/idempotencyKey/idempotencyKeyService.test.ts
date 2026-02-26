import { describe, expect, it } from "vitest";
import { IdempotencyKeyService } from "./idempotencyKeyService";

describe("IdempotencyKeyService", () => {
  describe("generate", () => {
    it("returns a string", () => {
      const result = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      expect(typeof result).toBe("string");
    });

    it("returns consistent UUID for same inputs", () => {
      const params = {
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      };
      const result1 = IdempotencyKeyService.generate(params);
      const result2 = IdempotencyKeyService.generate(params);
      expect(result1).toBe(result2);
    });

    it("returns different UUID for different startTime", () => {
      const result1 = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      const result2 = IdempotencyKeyService.generate({
        startTime: "2025-01-02T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      expect(result1).not.toBe(result2);
    });

    it("returns different UUID for different endTime", () => {
      const result1 = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      const result2 = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T12:00:00Z",
        userId: 1,
      });
      expect(result1).not.toBe(result2);
    });

    it("returns different UUID for different userId", () => {
      const result1 = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      const result2 = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 2,
      });
      expect(result1).not.toBe(result2);
    });

    it("handles Date objects as startTime/endTime", () => {
      const result = IdempotencyKeyService.generate({
        startTime: new Date("2025-01-01T10:00:00Z"),
        endTime: new Date("2025-01-01T11:00:00Z"),
        userId: 1,
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes reassignedById in key when provided", () => {
      const withoutReassigned = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      const withReassigned = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
        reassignedById: 5,
      });
      expect(withoutReassigned).not.toBe(withReassigned);
    });

    it("produces same key with null reassignedById as without it", () => {
      const withNull = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
        reassignedById: null,
      });
      const withoutIt = IdempotencyKeyService.generate({
        startTime: "2025-01-01T10:00:00Z",
        endTime: "2025-01-01T11:00:00Z",
        userId: 1,
      });
      expect(withNull).toBe(withoutIt);
    });
  });
});
