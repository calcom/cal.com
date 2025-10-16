import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@calcom/prisma";
import type { TeamBrandingContext, UserBrandingContext, BrandingServiceParams } from "../types";

// Mock the shouldHideBrandingForEvent function
vi.mock("@calcom/lib/hideBranding", () => ({
  shouldHideBrandingForEvent: vi.fn(),
}));

// Mock the BrandingRepository
vi.mock("@calcom/lib/server/repository/branding/BrandingRepository", () => ({
  BrandingRepository: vi.fn(),
}));

import { BrandingApplicationService } from "../BrandingApplicationService";
import { shouldHideBrandingForEvent } from "@calcom/lib/hideBranding";
import { BrandingRepository } from "@calcom/lib/server/repository/branding/BrandingRepository";

describe("BrandingApplicationService", () => {
  let service: BrandingApplicationService;
  let mockPrisma: any;
  let mockRepository: any;

  beforeEach(() => {
    mockPrisma = {};
    mockRepository = {
      getEventTypeBrandingContext: vi.fn(),
      getUserBranding: vi.fn(),
      getUserOrganizationId: vi.fn(),
    };

    // Mock the repository constructor
    vi.mocked(BrandingRepository).mockImplementation(() => mockRepository as any);

    service = new BrandingApplicationService(mockPrisma as PrismaClient);
    vi.clearAllMocks();
  });

  describe("computeHideBranding", () => {
    const mockTeamContext: TeamBrandingContext = {
      id: 1,
      hideBranding: true,
      parentId: 2,
      parent: { hideBranding: false },
    };

    const mockUserContext: UserBrandingContext = {
      id: 1,
      hideBranding: true,
    };

    it("should use provided teamContext and not fetch from repository", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: mockTeamContext,
        owner: mockUserContext,
        organizationId: 456,
      };

      (shouldHideBrandingForEvent as any).mockResolvedValue(true);

      const result = await service.computeHideBranding(input);

      expect(mockRepository.getEventTypeBrandingContext).not.toHaveBeenCalled();
      expect(mockRepository.getUserBranding).not.toHaveBeenCalled();
      expect(mockRepository.getUserOrganizationId).not.toHaveBeenCalled();
      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: mockTeamContext,
        owner: mockUserContext,
        organizationId: 456,
      });
      expect(result).toBe(true);
    });

    it("should fetch teamContext from repository when not provided", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        owner: mockUserContext,
        organizationId: 456,
      };

      mockRepository.getEventTypeBrandingContext.mockResolvedValue(mockTeamContext);
      (shouldHideBrandingForEvent as any).mockResolvedValue(false);

      const result = await service.computeHideBranding(input);

      expect(mockRepository.getEventTypeBrandingContext).toHaveBeenCalledWith(123);
      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: mockTeamContext,
        owner: mockUserContext,
        organizationId: 456,
      });
      expect(result).toBe(false);
    });

    it("should fetch owner from repository when not provided but ownerIdFallback is given", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: mockTeamContext,
        ownerIdFallback: 789,
        organizationId: 456,
      };

      mockRepository.getUserBranding.mockResolvedValue(mockUserContext);
      (shouldHideBrandingForEvent as any).mockResolvedValue(true);

      const result = await service.computeHideBranding(input);

      expect(mockRepository.getUserBranding).toHaveBeenCalledWith(789);
      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: mockTeamContext,
        owner: mockUserContext,
        organizationId: 456,
      });
      expect(result).toBe(true);
    });

    it("should fetch organizationId from repository when not provided but ownerIdFallback is given", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: mockTeamContext,
        owner: mockUserContext,
        ownerIdFallback: 789,
      };

      mockRepository.getUserOrganizationId.mockResolvedValue(999);
      (shouldHideBrandingForEvent as any).mockResolvedValue(false);

      const result = await service.computeHideBranding(input);

      expect(mockRepository.getUserOrganizationId).toHaveBeenCalledWith(789);
      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: mockTeamContext,
        owner: mockUserContext,
        organizationId: 999,
      });
      expect(result).toBe(false);
    });

    it("should handle null values from repository", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        ownerIdFallback: 789,
      };

      mockRepository.getEventTypeBrandingContext.mockResolvedValue(null);
      mockRepository.getUserBranding.mockResolvedValue(null);
      mockRepository.getUserOrganizationId.mockResolvedValue(null);
      (shouldHideBrandingForEvent as any).mockResolvedValue(false);

      const result = await service.computeHideBranding(input);

      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: null,
        owner: null,
        organizationId: null,
      });
      expect(result).toBe(false);
    });

    it("should handle team-only scenario", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: mockTeamContext,
      };

      (shouldHideBrandingForEvent as any).mockResolvedValue(true);

      const result = await service.computeHideBranding(input);

      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: mockTeamContext,
        owner: null,
        organizationId: null,
      });
      expect(result).toBe(true);
    });

    it("should handle owner-only scenario", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        owner: mockUserContext,
      };

      (shouldHideBrandingForEvent as any).mockResolvedValue(false);

      const result = await service.computeHideBranding(input);

      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: null,
        owner: mockUserContext,
        organizationId: null,
      });
      expect(result).toBe(false);
    });

    it("should handle parent-org scenario", async () => {
      const parentTeamContext: TeamBrandingContext = {
        id: 2,
        hideBranding: false,
        parentId: null,
        parent: null,
      };

      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: parentTeamContext,
        organizationId: 456,
      };

      (shouldHideBrandingForEvent as any).mockResolvedValue(false);

      const result = await service.computeHideBranding(input);

      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: parentTeamContext,
        owner: null,
        organizationId: 456,
      });
      expect(result).toBe(false);
    });

    it("should handle orgId hint scenario", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: mockTeamContext,
        owner: mockUserContext,
        ownerIdFallback: 789,
      };

      mockRepository.getUserOrganizationId.mockResolvedValue(999);
      (shouldHideBrandingForEvent as any).mockResolvedValue(true);

      const result = await service.computeHideBranding(input);

      expect(mockRepository.getUserOrganizationId).toHaveBeenCalledWith(789);
      expect(shouldHideBrandingForEvent).toHaveBeenCalledWith({
        eventTypeId: 123,
        team: mockTeamContext,
        owner: mockUserContext,
        organizationId: 999,
      });
      expect(result).toBe(true);
    });

    it("should handle error paths gracefully", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        ownerIdFallback: 789,
      };

      mockRepository.getEventTypeBrandingContext.mockRejectedValue(new Error("Database error"));
      mockRepository.getUserBranding.mockRejectedValue(new Error("User not found"));
      mockRepository.getUserOrganizationId.mockRejectedValue(new Error("Profile not found"));

      const result = await service.computeHideBranding(input);
      expect(result).toBe(false);
    });

    it("should handle shouldHideBrandingForEvent errors", async () => {
      const input: BrandingServiceParams = {
        eventTypeId: 123,
        teamContext: mockTeamContext,
        owner: mockUserContext,
        organizationId: 456,
      };

      (shouldHideBrandingForEvent as any).mockRejectedValue(new Error("Branding computation failed"));

      const result = await service.computeHideBranding(input);
      expect(result).toBe(false);
    });
  });
});
