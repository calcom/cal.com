import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import { StubTeamBillingService } from "./StubTeamBillingService";
import { TeamBillingService } from "./TeamBillingService";
import { TeamBillingServiceFactory } from "./TeamBillingServiceFactory";

describe("TeamBilling", () => {
  const mockTeam = { id: 1, metadata: null, isOrganization: true, parentId: null, name: "" };
  const mockTeams = [mockTeam, { id: 2, metadata: null, isOrganization: false, parentId: 1, name: "" }];

  let mockBillingProviderService: IBillingProviderService;
  let mockTeamBillingDataRepository: ITeamBillingDataRepository;
  let mockBillingRepository: IBillingRepository;
  let factory: TeamBillingServiceFactory;

  const createMockBillingProviderService = (): IBillingProviderService => ({
    handleSubscriptionCancel: vi.fn(),
    handleSubscriptionUpdate: vi.fn(),
    checkoutSessionIsPaid: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    handleEndTrial: vi.fn(),
    createCustomer: vi.fn(),
    createPrice: vi.fn(),
    getPrice: vi.fn(),
    getCheckoutSession: vi.fn(),
    createCheckoutSession: vi.fn(),
  });

  const createMockTeamBillingDataRepository = (): ITeamBillingDataRepository => ({
    find: vi.fn(),
    findMany: vi.fn(),
  });

  const createMockBillingRepository = (): IBillingRepository => ({
    create: vi.fn(),
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mockBillingProviderService = createMockBillingProviderService();
    mockTeamBillingDataRepository = createMockTeamBillingDataRepository();
    mockBillingRepository = createMockBillingRepository();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("init", () => {
    it("should return TeamBillingService when team billing is enabled", () => {
      factory = new TeamBillingServiceFactory({
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: () => mockBillingRepository,
        isTeamBillingEnabled: true,
      });

      const result = factory.init(mockTeam);

      expect(result).toBeInstanceOf(TeamBillingService);
    });

    it("should return StubTeamBillingService when team billing is disabled", () => {
      factory = new TeamBillingServiceFactory({
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: () => mockBillingRepository,
        isTeamBillingEnabled: false,
      });

      const result = factory.init(mockTeam);

      expect(result).toBeInstanceOf(StubTeamBillingService);
    });
  });

  describe("initMany", () => {
    it("should initialize multiple TeamBillingServices", () => {
      factory = new TeamBillingServiceFactory({
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: () => mockBillingRepository,
        isTeamBillingEnabled: false,
      });

      const result = factory.initMany(mockTeams);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(StubTeamBillingService);
      expect(result[1]).toBeInstanceOf(StubTeamBillingService);
    });
  });

  describe("findAndInit", () => {
    it("should find and initialize a single TeamBillingService", async () => {
      factory = new TeamBillingServiceFactory({
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: () => mockBillingRepository,
        isTeamBillingEnabled: true,
      });

      vi.mocked(mockTeamBillingDataRepository.find).mockResolvedValue(mockTeam);

      const result = await factory.findAndInit(1);

      expect(mockTeamBillingDataRepository.find).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(TeamBillingService);
    });
  });

  describe("findAndInitMany", () => {
    it("should find and initialize multiple team billings", async () => {
      factory = new TeamBillingServiceFactory({
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: () => mockBillingRepository,
        isTeamBillingEnabled: true,
      });

      vi.mocked(mockTeamBillingDataRepository.findMany).mockResolvedValue([mockTeam, { ...mockTeam, id: 2 }]);

      const result = await factory.findAndInitMany([1, 2]);

      expect(mockTeamBillingDataRepository.findMany).toHaveBeenCalledWith([1, 2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(TeamBillingService);
      expect(result[1]).toBeInstanceOf(TeamBillingService);
    });
  });
});
