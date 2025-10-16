import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@calcom/prisma";
import { BrandingRepository } from "../BrandingRepository";
import type { TeamBrandingContext, UserBrandingContext } from "@calcom/lib/branding/types";

describe("BrandingRepository", () => {
  let repository: BrandingRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      eventType: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      profile: {
        findFirst: vi.fn(),
      },
    };
    repository = new BrandingRepository(mockPrisma as PrismaClient);
  });

  describe("getEventTypeBrandingContext", () => {
    it("should return team context when event type has a team", async () => {
      const mockTeamContext: TeamBrandingContext = {
        id: 1,
        hideBranding: true,
        parentId: 2,
        parent: { hideBranding: false },
      };

      mockPrisma.eventType.findUnique.mockResolvedValue({
        teamId: 1,
        team: mockTeamContext,
      });

      const result = await repository.getEventTypeBrandingContext(123);

      expect(result).toEqual(mockTeamContext);
      expect(mockPrisma.eventType.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
        select: {
          teamId: true,
          team: {
            select: {
              id: true,
              hideBranding: true,
              parentId: true,
              parent: { select: { hideBranding: true } },
            },
          },
        },
      });
    });

    it("should return null when event type has no team", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        teamId: null,
        team: null,
      });

      const result = await repository.getEventTypeBrandingContext(123);

      expect(result).toBeNull();
    });

    it("should return null when event type is not found", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue(null);

      const result = await repository.getEventTypeBrandingContext(999);

      expect(result).toBeNull();
    });

    it("should handle team with no parent", async () => {
      const mockTeamContext: TeamBrandingContext = {
        id: 1,
        hideBranding: true,
        parentId: null,
        parent: null,
      };

      mockPrisma.eventType.findUnique.mockResolvedValue({
        teamId: 1,
        team: mockTeamContext,
      });

      const result = await repository.getEventTypeBrandingContext(123);

      expect(result).toEqual(mockTeamContext);
    });
  });

  describe("getUserBranding", () => {
    it("should return user branding context", async () => {
      const mockUser: UserBrandingContext = {
        id: 1,
        hideBranding: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.getUserBranding(123);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
        select: { id: true, hideBranding: true },
      });
    });

    it("should return null when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.getUserBranding(999);

      expect(result).toBeNull();
    });

    it("should handle user with null hideBranding", async () => {
      const mockUser: UserBrandingContext = {
        id: 1,
        hideBranding: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.getUserBranding(123);

      expect(result).toEqual(mockUser);
    });
  });

  describe("getUserOrganizationId", () => {
    it("should return organization ID when profile exists", async () => {
      mockPrisma.profile.findFirst.mockResolvedValue({
        organizationId: 456,
      });

      const result = await repository.getUserOrganizationId(123);

      expect(result).toBe(456);
      expect(mockPrisma.profile.findFirst).toHaveBeenCalledWith({
        where: { userId: 123, organizationId: undefined },
        select: { organizationId: true },
      });
    });

    it("should return organization ID with orgIdHint", async () => {
      mockPrisma.profile.findFirst.mockResolvedValue({
        organizationId: 789,
      });

      const result = await repository.getUserOrganizationId(123, 789);

      expect(result).toBe(789);
      expect(mockPrisma.profile.findFirst).toHaveBeenCalledWith({
        where: { userId: 123, organizationId: 789 },
        select: { organizationId: true },
      });
    });

    it("should return null when profile is not found", async () => {
      mockPrisma.profile.findFirst.mockResolvedValue(null);

      const result = await repository.getUserOrganizationId(999);

      expect(result).toBeNull();
    });

    it("should handle null orgIdHint", async () => {
      mockPrisma.profile.findFirst.mockResolvedValue({
        organizationId: 456,
      });

      const result = await repository.getUserOrganizationId(123, null);

      expect(result).toBe(456);
      expect(mockPrisma.profile.findFirst).toHaveBeenCalledWith({
        where: { userId: 123, organizationId: undefined },
        select: { organizationId: true },
      });
    });
  });
});
