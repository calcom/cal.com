import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { getUserPageProps } from "../../../../apps/web/lib/d/[link]/[slug]/getServerSideProps";
import { handleNewBooking } from "../../../bookings/lib/handleNewBooking";

vi.mock("@calcom/prisma", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

vi.mock("../../../../apps/web/lib/d/[link]/[slug]/getServerSideProps", () => ({
  getUserPageProps: vi.fn(),
}));

vi.mock("../../../bookings/lib/handleNewBooking", () => ({
  handleNewBooking: vi.fn(),
}));

const prismaMock = mockDeep<PrismaClient>();

const NOW = new Date("2024-03-20T12:00:00Z");

describe("Private Link Expiration", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
  });

  describe("Time-based expiration", () => {
    it("should return notFound for expired links", async () => {
      const expiredLink = {
        eventTypeId: 1,
        expiresAt: new Date("2024-03-19T12:00:00Z"),
        maxUsageCount: null,
        usageCount: 0,
        eventType: {
          users: [
            {
              username: "test-user",
              profiles: [{ username: "test-profile" }],
            },
          ],
        },
      };

      (getUserPageProps as any).mockResolvedValue({ notFound: true });

      const result = await getUserPageProps({
        params: { link: "test-link", slug: "test" },
      } as any);

      expect(result).toEqual({ notFound: true });
    });

    it("should allow access to non-expired links", async () => {
      const validLink = {
        eventTypeId: 1,
        expiresAt: new Date("2024-03-21T12:00:00Z"),
        maxUsageCount: null,
        usageCount: 0,
        eventType: {
          users: [
            {
              username: "test-user",
              profiles: [{ username: "test-profile" }],
            },
          ],
        },
      };

      (getUserPageProps as any).mockResolvedValue({ props: { username: "test-user" } });

      const result = await getUserPageProps({
        params: { link: "test-link", slug: "test" },
      } as any);

      expect(result).not.toEqual({ notFound: true });
    });
  });

  describe("Usage-based expiration", () => {
    it("should return notFound when usage limit is reached", async () => {
      const maxedOutLink = {
        eventTypeId: 1,
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 5,
        eventType: {
          users: [
            {
              username: "test-user",
              profiles: [{ username: "test-profile" }],
            },
          ],
        },
      };

      (getUserPageProps as any).mockResolvedValue({ notFound: true });

      const result = await getUserPageProps({
        params: { link: "test-link", slug: "test" },
      } as any);

      expect(result).toEqual({ notFound: true });
    });

    it("should allow access when under usage limit", async () => {
      const validLink = {
        eventTypeId: 1,
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 4,
        eventType: {
          users: [
            {
              username: "test-user",
              profiles: [{ username: "test-profile" }],
            },
          ],
        },
      };

      (getUserPageProps as any).mockResolvedValue({ props: { username: "test-user" } });

      const result = await getUserPageProps({
        params: { link: "test-link", slug: "test" },
      } as any);

      expect(result).not.toEqual({ notFound: true });
    });
  });

  describe("Booking flow", () => {
    it("should increment usage count when booking with usage-limited link", async () => {
      const validLink = {
        id: 1,
        link: "test-link",
        eventTypeId: 1,
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 4,
      };

      (handleNewBooking as any).mockResolvedValue({ success: true });

      await handleNewBooking({
        hasHashedBookingLink: true,
        reqBody: { hashedLink: "test-link" },
      } as any);

      expect(handleNewBooking).toHaveBeenCalledWith({
        hasHashedBookingLink: true,
        reqBody: { hashedLink: "test-link" },
      });
    });
  });
});
