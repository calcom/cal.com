import { describe, it, expect, vi, beforeEach } from "vitest";

import { CustomDomainRepository } from "./custom-domain-repository";

function createMockPrisma() {
  return {
    customDomain: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe("CustomDomainRepository", () => {
  let repo: CustomDomainRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    repo = new CustomDomainRepository(mockPrisma as any);
  });

  describe("slug normalization", () => {
    it("findBySlug lowercases the slug", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue(null);

      await repo.findBySlug("APP.Example.COM");

      expect(mockPrisma.customDomain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "app.example.com" } })
      );
    });

    it("findBySlugWithTeam lowercases the slug", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue(null);

      await repo.findBySlugWithTeam("APP.Example.COM");

      expect(mockPrisma.customDomain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "app.example.com" } })
      );
    });

    it("create lowercases the slug", async () => {
      mockPrisma.customDomain.create.mockResolvedValue({ id: "d1", slug: "app.example.com" });

      await repo.create({ teamId: 1, slug: "APP.Example.COM" });

      expect(mockPrisma.customDomain.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "app.example.com" }),
        })
      );
    });

    it("updateSlug lowercases the new slug", async () => {
      mockPrisma.customDomain.update.mockResolvedValue({ id: "d1", slug: "new.example.com" });

      await repo.updateSlug("d1", "NEW.Example.COM");

      expect(mockPrisma.customDomain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "new.example.com" }),
        })
      );
    });

    it("existsBySlug lowercases the slug", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue(null);

      await repo.existsBySlug("APP.Example.COM");

      expect(mockPrisma.customDomain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "app.example.com" } })
      );
    });
  });

  describe("create", () => {
    it("sets verified to false for new domains", async () => {
      mockPrisma.customDomain.create.mockResolvedValue({ id: "d1", slug: "app.example.com", verified: false });

      await repo.create({ teamId: 1, slug: "app.example.com" });

      expect(mockPrisma.customDomain.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verified: false, teamId: 1 }),
        })
      );
    });
  });

  describe("updateSlug", () => {
    it("resets verified to false when slug changes", async () => {
      mockPrisma.customDomain.update.mockResolvedValue({ id: "d1", slug: "new.example.com", verified: false });

      await repo.updateSlug("d1", "new.example.com");

      expect(mockPrisma.customDomain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verified: false }),
        })
      );
    });

    it("updates lastCheckedAt timestamp", async () => {
      mockPrisma.customDomain.update.mockResolvedValue({ id: "d1" });

      await repo.updateSlug("d1", "new.example.com");

      const callData = mockPrisma.customDomain.update.mock.calls[0][0].data;
      expect(callData.lastCheckedAt).toBeInstanceOf(Date);
    });
  });

  describe("updateVerificationStatus", () => {
    it("updates lastCheckedAt when verification status changes", async () => {
      mockPrisma.customDomain.update.mockResolvedValue({ id: "d1", verified: true });

      await repo.updateVerificationStatus("d1", true);

      const callData = mockPrisma.customDomain.update.mock.calls[0][0].data;
      expect(callData.verified).toBe(true);
      expect(callData.lastCheckedAt).toBeInstanceOf(Date);
    });
  });

  describe("existsBySlug", () => {
    it("returns true when domain exists", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue({ id: "d1" });

      const result = await repo.existsBySlug("app.example.com");

      expect(result).toBe(true);
    });

    it("returns false when domain does not exist", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue(null);

      const result = await repo.existsBySlug("free.example.com");

      expect(result).toBe(false);
    });
  });

  describe("getUnverifiedDomainsForCheck", () => {
    it("defaults to limit of 30", async () => {
      mockPrisma.customDomain.findMany.mockResolvedValue([]);

      await repo.getUnverifiedDomainsForCheck();

      expect(mockPrisma.customDomain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 30 })
      );
    });

    it("respects custom limit", async () => {
      mockPrisma.customDomain.findMany.mockResolvedValue([]);

      await repo.getUnverifiedDomainsForCheck(10);

      expect(mockPrisma.customDomain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it("filters for unverified domains ordered by lastCheckedAt", async () => {
      mockPrisma.customDomain.findMany.mockResolvedValue([]);

      await repo.getUnverifiedDomainsForCheck();

      expect(mockPrisma.customDomain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { verified: false },
          orderBy: { lastCheckedAt: "asc" },
        })
      );
    });
  });

  describe("query methods use select (not include)", () => {
    it("findById uses select", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue(null);

      await repo.findById("d1");

      const call = mockPrisma.customDomain.findUnique.mock.calls[0][0];
      expect(call.select).toBeDefined();
      expect(call.include).toBeUndefined();
    });

    it("findByTeamId uses select", async () => {
      mockPrisma.customDomain.findUnique.mockResolvedValue(null);

      await repo.findByTeamId(1);

      const call = mockPrisma.customDomain.findUnique.mock.calls[0][0];
      expect(call.select).toBeDefined();
      expect(call.include).toBeUndefined();
    });

    it("delete uses select", async () => {
      mockPrisma.customDomain.delete.mockResolvedValue({ id: "d1" });

      await repo.delete("d1");

      const call = mockPrisma.customDomain.delete.mock.calls[0][0];
      expect(call.select).toBeDefined();
      expect(call.include).toBeUndefined();
    });
  });
});
