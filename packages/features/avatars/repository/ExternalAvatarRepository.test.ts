import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExternalAvatarRepository } from "./ExternalAvatarRepository";

function createMockPrisma() {
  return {
    externalAvatar: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

describe("ExternalAvatarRepository", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let repository: ExternalAvatarRepository;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new ExternalAvatarRepository(mockPrisma as any);
  });

  describe("findByEmail", () => {
    it("returns cached entry when found", async () => {
      const cached = { email: "test@example.com", imageUrl: "https://example.com/avatar.png" };
      mockPrisma.externalAvatar.findUnique.mockResolvedValueOnce(cached);

      const result = await repository.findByEmail("test@example.com");

      expect(result).toEqual(cached);
      expect(mockPrisma.externalAvatar.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { email: true, imageUrl: true },
      });
    });

    it("returns null when no entry exists", async () => {
      mockPrisma.externalAvatar.findUnique.mockResolvedValueOnce(null);

      const result = await repository.findByEmail("unknown@example.com");

      expect(result).toBeNull();
    });

    it("returns entry with null imageUrl for checked-but-not-found emails", async () => {
      const cached = { email: "no-avatar@example.com", imageUrl: null };
      mockPrisma.externalAvatar.findUnique.mockResolvedValueOnce(cached);

      const result = await repository.findByEmail("no-avatar@example.com");

      expect(result).toEqual(cached);
      expect(result?.imageUrl).toBeNull();
    });
  });

  describe("upsert", () => {
    it("creates entry with image URL", async () => {
      const entry = { email: "test@example.com", imageUrl: "https://example.com/avatar.png" };
      mockPrisma.externalAvatar.upsert.mockResolvedValueOnce(entry);

      const result = await repository.upsert("test@example.com", "https://example.com/avatar.png");

      expect(result).toEqual(entry);
      expect(mockPrisma.externalAvatar.upsert).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        create: { email: "test@example.com", imageUrl: "https://example.com/avatar.png" },
        update: { imageUrl: "https://example.com/avatar.png" },
        select: { email: true, imageUrl: true },
      });
    });

    it("creates entry with null imageUrl for not-found results", async () => {
      const entry = { email: "no-avatar@example.com", imageUrl: null };
      mockPrisma.externalAvatar.upsert.mockResolvedValueOnce(entry);

      const result = await repository.upsert("no-avatar@example.com", null);

      expect(result).toEqual(entry);
      expect(mockPrisma.externalAvatar.upsert).toHaveBeenCalledWith({
        where: { email: "no-avatar@example.com" },
        create: { email: "no-avatar@example.com", imageUrl: null },
        update: { imageUrl: null },
        select: { email: true, imageUrl: true },
      });
    });

    it("updates existing entry when email already cached", async () => {
      const updated = { email: "test@example.com", imageUrl: "https://example.com/new-avatar.png" };
      mockPrisma.externalAvatar.upsert.mockResolvedValueOnce(updated);

      const result = await repository.upsert("test@example.com", "https://example.com/new-avatar.png");

      expect(result).toEqual(updated);
    });
  });
});
