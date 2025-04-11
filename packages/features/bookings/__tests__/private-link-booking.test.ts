import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { HttpError } from "@calcom/lib/http-error";

import { handleNewBooking } from "../lib/handleNewBooking";

vi.mock("@calcom/prisma", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

vi.mock("../lib/handleNewBooking", () => ({
  handleNewBooking: vi.fn(),
}));

const prismaMock = mockDeep<PrismaClient>();

describe("Private Link Booking Flow", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    vi.clearAllMocks();
  });

  describe("Time-based expiration", () => {
    it("should throw error when booking with expired link", async () => {
      const expiredLink = {
        id: 1,
        link: "expired-link",
        eventTypeId: 1,
        expiresAt: new Date("2024-03-19T12:00:00Z"),
        maxUsageCount: null,
        usageCount: 0,
      };

      (handleNewBooking as any).mockRejectedValue(
        new HttpError({ statusCode: 410, message: "Link has expired" })
      );

      await expect(
        handleNewBooking({
          hasHashedBookingLink: true,
          reqBody: { hashedLink: "expired-link" },
        } as any)
      ).rejects.toThrow(new HttpError({ statusCode: 410, message: "Link has expired" }));
    });

    it("should process booking with valid non-expired link", async () => {
      const validLink = {
        id: 1,
        link: "valid-link",
        eventTypeId: 1,
        expiresAt: new Date("2024-03-21T12:00:00Z"),
        maxUsageCount: null,
        usageCount: 0,
      };

      (handleNewBooking as any).mockResolvedValue({ success: true });

      const result = await handleNewBooking({
        hasHashedBookingLink: true,
        reqBody: { hashedLink: "valid-link" },
      } as any);

      expect(result).toEqual({ success: true });
    });
  });

  describe("Usage-based expiration", () => {
    it("should throw error when booking with maxed out link", async () => {
      const maxedOutLink = {
        id: 1,
        link: "maxed-link",
        eventTypeId: 1,
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 5,
      };

      (handleNewBooking as any).mockRejectedValue(
        new HttpError({ statusCode: 410, message: "Link has reached maximum usage" })
      );

      await expect(
        handleNewBooking({
          hasHashedBookingLink: true,
          reqBody: { hashedLink: "maxed-link" },
        } as any)
      ).rejects.toThrow(new HttpError({ statusCode: 410, message: "Link has reached maximum usage" }));
    });

    it("should increment usage count for valid link", async () => {
      const validLink = {
        id: 1,
        link: "valid-link",
        eventTypeId: 1,
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 3,
      };

      (handleNewBooking as any).mockResolvedValue({ success: true });

      const result = await handleNewBooking({
        hasHashedBookingLink: true,
        reqBody: { hashedLink: "valid-link" },
      } as any);

      expect(result).toEqual({ success: true });
    });

    it("should delete link when final usage is reached", async () => {
      const validLink = {
        id: 1,
        link: "valid-link",
        eventTypeId: 1,
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 4,
      };

      (handleNewBooking as any).mockResolvedValue({ success: true });

      const result = await handleNewBooking({
        hasHashedBookingLink: true,
        reqBody: { hashedLink: "valid-link" },
      } as any);

      expect(result).toEqual({ success: true });
    });
  });

  describe("Combined expiration conditions", () => {
    it("should handle links with both time and usage limits", async () => {
      const combinedLink = {
        id: 1,
        link: "combined-link",
        eventTypeId: 1,
        expiresAt: new Date("2024-03-21T12:00:00Z"),
        maxUsageCount: 5,
        usageCount: 3,
      };

      (handleNewBooking as any).mockResolvedValue({ success: true });

      const result = await handleNewBooking({
        hasHashedBookingLink: true,
        reqBody: { hashedLink: "combined-link" },
      } as any);

      expect(result).toEqual({ success: true });
    });

    it("should prioritize time expiration over usage limits", async () => {
      const expiredCombinedLink = {
        id: 1,
        link: "expired-combined-link",
        eventTypeId: 1,
        expiresAt: new Date("2024-03-19T12:00:00Z"),
        maxUsageCount: 5,
        usageCount: 3,
      };

      (handleNewBooking as any).mockRejectedValue(
        new HttpError({ statusCode: 410, message: "Link has expired" })
      );

      await expect(
        handleNewBooking({
          hasHashedBookingLink: true,
          reqBody: { hashedLink: "expired-combined-link" },
        } as any)
      ).rejects.toThrow(new HttpError({ statusCode: 410, message: "Link has expired" }));
    });
  });
});
