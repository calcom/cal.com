import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";

import type { IBillingRepository } from "../../../repository/billing/IBillingRepository";
import type { IDunningService } from "../IDunningService";
import { DunningStatusResolver } from "../DunningStatusResolver";

function createMockDunningService(): { [K in keyof IDunningService]: ReturnType<typeof vi.fn> } {
  return {
    onPaymentFailed: vi.fn(),
    onPaymentSucceeded: vi.fn(),
    getBillingIdsToAdvance: vi.fn(),
    advanceDunning: vi.fn(),
    getStatus: vi.fn().mockResolvedValue("CURRENT"),
  };
}

function createMockBillingRepo(): { findByTeamId: ReturnType<typeof vi.fn> } {
  return {
    findByTeamId: vi.fn().mockResolvedValue(null),
  };
}

describe("DunningStatusResolver", () => {
  let resolver: DunningStatusResolver;
  let mockTeamDunningService: ReturnType<typeof createMockDunningService>;
  let mockOrgDunningService: ReturnType<typeof createMockDunningService>;
  let mockTeamRepository: { findParentOrganizationByTeamId: ReturnType<typeof vi.fn> };
  let mockTeamBillingRepo: ReturnType<typeof createMockBillingRepo>;
  let mockOrgBillingRepo: ReturnType<typeof createMockBillingRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamDunningService = createMockDunningService();
    mockOrgDunningService = createMockDunningService();
    mockTeamRepository = { findParentOrganizationByTeamId: vi.fn().mockResolvedValue(null) };
    mockTeamBillingRepo = createMockBillingRepo();
    mockOrgBillingRepo = createMockBillingRepo();

    resolver = new DunningStatusResolver({
      teamDunningService: mockTeamDunningService as unknown as IDunningService,
      orgDunningService: mockOrgDunningService as unknown as IDunningService,
      teamRepository: mockTeamRepository as unknown as TeamRepository,
      teamBillingRepository: mockTeamBillingRepo as unknown as IBillingRepository,
      orgBillingRepository: mockOrgBillingRepo as unknown as IBillingRepository,
    });
  });

  it("returns CURRENT when team has no billing record and no parent org", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue(null);
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue(null);

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("CURRENT");
    expect(mockTeamDunningService.getStatus).not.toHaveBeenCalled();
  });

  it("returns team status when no parent org", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue("tb_1");
    mockTeamDunningService.getStatus.mockResolvedValue("WARNING");
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue(null);

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("WARNING");
    expect(mockTeamDunningService.getStatus).toHaveBeenCalledWith("tb_1");
  });

  it("returns org status when org is worse than team (cascade)", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue("tb_1");
    mockTeamDunningService.getStatus.mockResolvedValue("WARNING");
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue({ id: 100 });
    mockOrgBillingRepo.findByTeamId.mockResolvedValue("ob_1");
    mockOrgDunningService.getStatus.mockResolvedValue("HARD_BLOCKED");

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("HARD_BLOCKED");
  });

  it("returns team status when team is worse than org", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue("tb_1");
    mockTeamDunningService.getStatus.mockResolvedValue("HARD_BLOCKED");
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue({ id: 100 });
    mockOrgBillingRepo.findByTeamId.mockResolvedValue("ob_1");
    mockOrgDunningService.getStatus.mockResolvedValue("WARNING");

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("HARD_BLOCKED");
  });

  it("returns CURRENT when both team and org are CURRENT", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue("tb_1");
    mockTeamDunningService.getStatus.mockResolvedValue("CURRENT");
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue({ id: 100 });
    mockOrgBillingRepo.findByTeamId.mockResolvedValue("ob_1");
    mockOrgDunningService.getStatus.mockResolvedValue("CURRENT");

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("CURRENT");
  });

  it("returns CURRENT when team has billing but parent org has no billing", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue("tb_1");
    mockTeamDunningService.getStatus.mockResolvedValue("CURRENT");
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue({ id: 100 });
    mockOrgBillingRepo.findByTeamId.mockResolvedValue(null);

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("CURRENT");
    expect(mockOrgDunningService.getStatus).not.toHaveBeenCalled();
  });

  it("returns org status when team has no billing record but org does", async () => {
    mockTeamBillingRepo.findByTeamId.mockResolvedValue(null);
    mockTeamRepository.findParentOrganizationByTeamId.mockResolvedValue({ id: 100 });
    mockOrgBillingRepo.findByTeamId.mockResolvedValue("ob_1");
    mockOrgDunningService.getStatus.mockResolvedValue("SOFT_BLOCKED");

    const status = await resolver.getEffectiveStatus(10);

    expect(status).toBe("SOFT_BLOCKED");
  });
});
