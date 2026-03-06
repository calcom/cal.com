import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IBillingRepository } from "../../../repository/billing/IBillingRepository";
import type { IDunningService } from "../IDunningService";
import { DunningServiceFactory } from "../DunningServiceFactory";

function createMockBillingRepo(): {
  findByTeamId: ReturnType<typeof vi.fn>;
  findTeamIdByBillingId: ReturnType<typeof vi.fn>;
} {
  return {
    findByTeamId: vi.fn().mockResolvedValue(null),
    findTeamIdByBillingId: vi.fn().mockResolvedValue(null),
  };
}

function createMockDunningService(): {
  getBillingIdsToAdvance: ReturnType<typeof vi.fn>;
  advanceDunning: ReturnType<typeof vi.fn>;
} {
  return {
    getBillingIdsToAdvance: vi.fn().mockResolvedValue([]),
    advanceDunning: vi.fn().mockResolvedValue({ advanced: false }),
  };
}

describe("DunningServiceFactory", () => {
  let mockTeamService: ReturnType<typeof createMockDunningService>;
  let mockOrgService: ReturnType<typeof createMockDunningService>;
  let mockTeamBillingRepo: ReturnType<typeof createMockBillingRepo>;
  let mockOrgBillingRepo: ReturnType<typeof createMockBillingRepo>;
  let factory: DunningServiceFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamService = createMockDunningService();
    mockOrgService = createMockDunningService();
    mockTeamBillingRepo = createMockBillingRepo();
    mockOrgBillingRepo = createMockBillingRepo();
    factory = new DunningServiceFactory({
      teamDunningService: mockTeamService as unknown as IDunningService,
      orgDunningService: mockOrgService as unknown as IDunningService,
      teamBillingRepository: mockTeamBillingRepo as unknown as IBillingRepository,
      orgBillingRepository: mockOrgBillingRepo as unknown as IBillingRepository,
    });
  });

  describe("forTeam", () => {
    it("returns org service when team has organization billing", async () => {
      mockOrgBillingRepo.findByTeamId.mockResolvedValue("org_billing_123");

      const result = await factory.forTeam(10);

      expect(result).toEqual({
        service: mockOrgService,
        billingId: "org_billing_123",
        entityType: "organization",
      });
      expect(mockTeamBillingRepo.findByTeamId).not.toHaveBeenCalled();
    });

    it("returns team service when team has team billing", async () => {
      mockOrgBillingRepo.findByTeamId.mockResolvedValue(null);
      mockTeamBillingRepo.findByTeamId.mockResolvedValue("team_billing_456");

      const result = await factory.forTeam(10);

      expect(result).toEqual({
        service: mockTeamService,
        billingId: "team_billing_456",
        entityType: "team",
      });
    });

    it("returns null when team has no billing record", async () => {
      const result = await factory.forTeam(10);
      expect(result).toBeNull();
    });

    it("prefers org billing over team billing", async () => {
      mockOrgBillingRepo.findByTeamId.mockResolvedValue("org_billing_789");
      mockTeamBillingRepo.findByTeamId.mockResolvedValue("team_billing_000");

      const result = await factory.forTeam(10);

      expect(result!.entityType).toBe("organization");
      expect(result!.billingId).toBe("org_billing_789");
    });
  });

  describe("getAdvancementCandidates", () => {
    it("combines billing IDs from both services with entity types", async () => {
      mockTeamService.getBillingIdsToAdvance.mockResolvedValue(["team_b1", "team_b2"]);
      mockOrgService.getBillingIdsToAdvance.mockResolvedValue(["org_b1"]);

      const candidates = await factory.getAdvancementCandidates();

      expect(candidates).toEqual([
        { billingId: "team_b1", entityType: "team" },
        { billingId: "team_b2", entityType: "team" },
        { billingId: "org_b1", entityType: "organization" },
      ]);
    });

    it("returns empty array when no candidates", async () => {
      const candidates = await factory.getAdvancementCandidates();
      expect(candidates).toEqual([]);
    });
  });

  describe("advanceByBillingId", () => {
    it("uses team service for team entity type", async () => {
      mockTeamService.advanceDunning.mockResolvedValue({ advanced: true, from: "WARNING", to: "SOFT_BLOCKED" });

      const result = await factory.advanceByBillingId("billing_1", "team");

      expect(mockTeamService.advanceDunning).toHaveBeenCalledWith("billing_1");
      expect(mockOrgService.advanceDunning).not.toHaveBeenCalled();
      expect(result).toEqual({ advanced: true, from: "WARNING", to: "SOFT_BLOCKED" });
    });

    it("uses org service for organization entity type", async () => {
      mockOrgService.advanceDunning.mockResolvedValue({ advanced: true, from: "SOFT_BLOCKED", to: "HARD_BLOCKED" });

      const result = await factory.advanceByBillingId("billing_2", "organization");

      expect(mockOrgService.advanceDunning).toHaveBeenCalledWith("billing_2");
      expect(mockTeamService.advanceDunning).not.toHaveBeenCalled();
      expect(result).toEqual({ advanced: true, from: "SOFT_BLOCKED", to: "HARD_BLOCKED" });
    });
  });

  describe("findTeamIdByBillingId", () => {
    it("uses team billing repo for team entity type", async () => {
      mockTeamBillingRepo.findTeamIdByBillingId.mockResolvedValue(42);

      const teamId = await factory.findTeamIdByBillingId("billing_1", "team");

      expect(teamId).toBe(42);
      expect(mockTeamBillingRepo.findTeamIdByBillingId).toHaveBeenCalledWith("billing_1");
      expect(mockOrgBillingRepo.findTeamIdByBillingId).not.toHaveBeenCalled();
    });

    it("uses org billing repo for organization entity type", async () => {
      mockOrgBillingRepo.findTeamIdByBillingId.mockResolvedValue(99);

      const teamId = await factory.findTeamIdByBillingId("billing_2", "organization");

      expect(teamId).toBe(99);
      expect(mockOrgBillingRepo.findTeamIdByBillingId).toHaveBeenCalledWith("billing_2");
    });

    it("returns null when billing ID not found", async () => {
      const teamId = await factory.findTeamIdByBillingId("nonexistent", "team");
      expect(teamId).toBeNull();
    });
  });
});
