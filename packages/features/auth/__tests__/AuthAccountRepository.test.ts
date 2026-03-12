import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import { AuthAccountRepository } from "../repositories/AuthAccountRepository";

describe("AuthAccountRepository", () => {
  let repo: AuthAccountRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
    repo = new AuthAccountRepository(mockPrisma);
  });

  describe("findByIdentityProvider", () => {
    it("queries by identity provider and providerAccountId with case-insensitive match", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await repo.findByIdentityProvider(IdentityProvider.GOOGLE, "google-id-123");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            identityProvider: IdentityProvider.GOOGLE,
            identityProviderId: {
              equals: "google-id-123",
              mode: "insensitive",
            },
          },
          select: expect.objectContaining({
            id: true,
            email: true,
            username: true,
          }),
        })
      );
    });

    it("returns null when no user found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await repo.findByIdentityProvider(IdentityProvider.GOOGLE, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findAndFixLegacyIdentityProviderId", () => {
    it("returns null when no legacy user found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await repo.findAndFixLegacyIdentityProviderId(
        IdentityProvider.GOOGLE,
        "123",
        "correct-id"
      );

      expect(result).toBeNull();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("updates identityProviderId when legacy user found", async () => {
      const legacyUser = { id: 1, email: "test@test.com" };
      mockPrisma.user.findFirst.mockResolvedValue(legacyUser);
      mockPrisma.user.update.mockResolvedValue(legacyUser);

      const result = await repo.findAndFixLegacyIdentityProviderId(
        IdentityProvider.GOOGLE,
        "1",
        "correct-provider-id"
      );

      expect(result).toEqual(legacyUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { identityProviderId: "correct-provider-id" },
      });
    });
  });

  describe("findByEmailWithPassword", () => {
    it("queries with case-insensitive email and selects password hash", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await repo.findByEmailWithPassword("Test@Example.com");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: {
              equals: "Test@Example.com",
              mode: "insensitive",
            },
          },
          select: expect.objectContaining({
            id: true,
            email: true,
            password: { select: { hash: true } },
          }),
        })
      );
    });
  });

  describe("updateIdentityProvider", () => {
    it("updates identity provider and providerAccountId", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 1 });

      await repo.updateIdentityProvider(1, IdentityProvider.SAML, "saml-id");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          identityProvider: IdentityProvider.SAML,
          identityProviderId: "saml-id",
        },
      });
    });
  });

  describe("updateEmail", () => {
    it("updates user email", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 1 });

      await repo.updateEmail(1, "new@email.com");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { email: "new@email.com" },
      });
    });
  });
});
