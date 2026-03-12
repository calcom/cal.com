import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HashedLinkRepository } from "./HashedLinkRepository";

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

function createMockPrisma() {
  return {
    hashedLink: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

describe("HashedLinkRepository", () => {
  let mockPrisma: PrismaClient;
  let repo: HashedLinkRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    repo = new HashedLinkRepository(mockPrisma);
  });

  describe("deleteLinks - early return guard", () => {
    // Scenario 32: Empty linksToDelete returns early
    it("returns early without calling prisma when linksToDelete is empty", async () => {
      const result = await repo.deleteLinks(1, []);

      expect(result).toBeUndefined();
      expect(mockPrisma.hashedLink.deleteMany as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    });
  });

  describe("createLink - conditional maxUsageCount", () => {
    // Scenario 33: maxUsageCount is finite number
    it("sets maxUsageCount when it is a finite number", async () => {
      await repo.createLink(1, { link: "abc", expiresAt: null, maxUsageCount: 5 });

      expect(mockPrisma.hashedLink.create as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({
        data: {
          eventTypeId: 1,
          link: "abc",
          expiresAt: null,
          maxUsageCount: 5,
        },
      });
    });

    // Scenario 34: maxUsageCount is null
    it("does not set maxUsageCount when it is null", async () => {
      await repo.createLink(1, { link: "abc", expiresAt: null, maxUsageCount: null });

      const callArg = (mockPrisma.hashedLink.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.data).not.toHaveProperty("maxUsageCount");
    });

    // Scenario 35: maxUsageCount is Infinity
    it("does not set maxUsageCount when it is Infinity", async () => {
      await repo.createLink(1, { link: "abc", expiresAt: null, maxUsageCount: Infinity });

      const callArg = (mockPrisma.hashedLink.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.data).not.toHaveProperty("maxUsageCount");
    });

    // Scenario 36: maxUsageCount is 0
    it("does not set maxUsageCount when it is 0", async () => {
      await repo.createLink(1, { link: "abc", expiresAt: null, maxUsageCount: 0 });

      const callArg = (mockPrisma.hashedLink.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.data).not.toHaveProperty("maxUsageCount");
    });
  });

  describe("updateLink - conditional maxUsageCount", () => {
    // Scenario 37: maxUsageCount is a number > 0
    it("sets maxUsageCount when it is a positive number", async () => {
      await repo.updateLink(1, { link: "abc", expiresAt: null, maxUsageCount: 10 });

      expect(mockPrisma.hashedLink.updateMany as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({
        where: { eventTypeId: 1, link: "abc" },
        data: { expiresAt: null, maxUsageCount: 10 },
      });
    });

    // Scenario 38: maxUsageCount is null
    it("does not set maxUsageCount when it is null", async () => {
      await repo.updateLink(1, { link: "abc", expiresAt: null, maxUsageCount: null });

      const callArg = (mockPrisma.hashedLink.updateMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.data).not.toHaveProperty("maxUsageCount");
    });

    // Scenario 39: maxUsageCount is undefined
    it("does not set maxUsageCount when it is undefined", async () => {
      await repo.updateLink(1, { link: "abc", expiresAt: null, maxUsageCount: undefined });

      const callArg = (mockPrisma.hashedLink.updateMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.data).not.toHaveProperty("maxUsageCount");
    });
  });
});
