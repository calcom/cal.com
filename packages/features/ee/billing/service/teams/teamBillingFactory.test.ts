import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StubTeamBillingService } from "./stubTeamBillingService";
import { TeamBillingService } from "./teamBillingService";

vi.mock("@calcom/ee/billing/di/containers/Billing");

describe("TeamBilling", () => {
  const mockTeam = { id: 1, metadata: null, isOrganization: true, parentId: null, name: "" };
  const mockTeams = [mockTeam, { id: 2, metadata: null, isOrganization: false, parentId: 1, name: "" }];

  let mockFactory: {
    init: ReturnType<typeof vi.fn>;
    initMany: ReturnType<typeof vi.fn>;
    findAndInit: ReturnType<typeof vi.fn>;
    findAndInitMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    mockFactory = {
      init: vi.fn(),
      initMany: vi.fn(),
      findAndInit: vi.fn(),
      findAndInitMany: vi.fn(),
    };

    const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
    vi.mocked(getTeamBillingServiceFactory).mockReturnValue(mockFactory);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("init", () => {
    it("should return TeamBillingService when team billing is enabled", async () => {
      const mockTeamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: {} as never,
        teamBillingDataRepository: {} as never,
        billingRepository: {} as never,
      });
      mockFactory.init.mockReturnValue(mockTeamBillingService);

      const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
      const factory = getTeamBillingServiceFactory();
      const result = factory.init(mockTeam);
      
      expect(result).toBeInstanceOf(TeamBillingService);
    });

    it("should return StubTeamBillingService when team billing is disabled", async () => {
      const mockStubService = new StubTeamBillingService(mockTeam);
      mockFactory.init.mockReturnValue(mockStubService);

      const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
      const factory = getTeamBillingServiceFactory();
      const result = factory.init(mockTeam);

      expect(result).toBeInstanceOf(StubTeamBillingService);
    });
  });

  describe("initMany", () => {
    it("should initialize multiple TeamBillingServices", async () => {
      const mockServices = [
        new StubTeamBillingService(mockTeams[0]),
        new StubTeamBillingService(mockTeams[1]),
      ];
      mockFactory.initMany.mockReturnValue(mockServices);

      const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
      const factory = getTeamBillingServiceFactory();
      const result = factory.initMany(mockTeams);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(StubTeamBillingService);
      expect(result[1]).toBeInstanceOf(StubTeamBillingService);
    });
  });

  describe("findAndInit", () => {
    it("should find and initialize a single TeamBillingService", async () => {
      const mockTeamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: {} as never,
        teamBillingDataRepository: {} as never,
        billingRepository: {} as never,
      });
      mockFactory.findAndInit.mockResolvedValue(mockTeamBillingService);

      prismaMock.team.findUniqueOrThrow.mockResolvedValue(mockTeam);

      const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
      const factory = getTeamBillingServiceFactory();
      const result = await factory.findAndInit(1);

      expect(result).toBeInstanceOf(TeamBillingService);
    });
  });

  describe("findAndInitMany", () => {
    it("should find and initialize multiple team billings", async () => {
      const mockServices = [
        new TeamBillingService({
          team: mockTeam,
          billingProviderService: {} as never,
          teamBillingDataRepository: {} as never,
          billingRepository: {} as never,
        }),
        new TeamBillingService({
          team: { ...mockTeam, id: 2 },
          billingProviderService: {} as never,
          teamBillingDataRepository: {} as never,
          billingRepository: {} as never,
        }),
      ];
      mockFactory.findAndInitMany.mockResolvedValue(mockServices);

      prismaMock.team.findMany.mockResolvedValue([mockTeam, { ...mockTeam, id: 2 }]);

      const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
      const factory = getTeamBillingServiceFactory();
      const result = await factory.findAndInitMany([1, 2]);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(TeamBillingService);
      expect(result[1]).toBeInstanceOf(TeamBillingService);
    });
  });
});
