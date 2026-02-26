import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IBillingRepository } from "../../../repository/billing/IBillingRepository";
import type { IDunningService } from "../IDunningService";
import { DunningServiceFactory } from "../DunningServiceFactory";

function createMockBillingRepo(): { findByTeamId: ReturnType<typeof vi.fn> } {
  return {
    findByTeamId: vi.fn().mockResolvedValue(null),
  };
}

describe("DunningServiceFactory", () => {
  const mockTeamService = { name: "team" } as unknown as IDunningService;
  const mockOrgService = { name: "org" } as unknown as IDunningService;
  let mockTeamBillingRepo: ReturnType<typeof createMockBillingRepo>;
  let mockOrgBillingRepo: ReturnType<typeof createMockBillingRepo>;
  let factory: DunningServiceFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamBillingRepo = createMockBillingRepo();
    mockOrgBillingRepo = createMockBillingRepo();
    factory = new DunningServiceFactory({
      teamDunningService: mockTeamService,
      orgDunningService: mockOrgService,
      teamBillingRepository: mockTeamBillingRepo as unknown as IBillingRepository,
      orgBillingRepository: mockOrgBillingRepo as unknown as IBillingRepository,
    });
  });

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
    mockOrgBillingRepo.findByTeamId.mockResolvedValue(null);
    mockTeamBillingRepo.findByTeamId.mockResolvedValue(null);

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
