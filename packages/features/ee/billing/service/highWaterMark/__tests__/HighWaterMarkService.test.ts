import { describe, it, expect, vi, beforeEach } from "vitest";

import { HighWaterMarkService } from "../HighWaterMarkService";

// Mock logger
const createMockLogger = () => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

// Mock repository
const createMockRepository = () => ({
  getByTeamId: vi.fn(),
  getBySubscriptionId: vi.fn(),
  updateIfHigher: vi.fn(),
  reset: vi.fn(),
  updateQuantityAfterStripeSync: vi.fn(),
});

// Mock team repository
const createMockTeamRepository = () => ({
  getTeamMemberCount: vi.fn(),
});

// Mock billing service
const createMockBillingService = () => ({
  handleSubscriptionUpdate: vi.fn(),
  getSubscription: vi.fn(),
});

// Mock features repository
const createMockFeaturesRepository = () => ({
  checkIfFeatureIsEnabledGlobally: vi.fn(),
});

describe("HighWaterMarkService", () => {
  let service: HighWaterMarkService;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;
  let mockBillingService: ReturnType<typeof createMockBillingService>;
  let mockFeaturesRepository: ReturnType<typeof createMockFeaturesRepository>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockRepository = createMockRepository();
    mockTeamRepository = createMockTeamRepository();
    mockBillingService = createMockBillingService();
    mockFeaturesRepository = createMockFeaturesRepository();

    service = new HighWaterMarkService({
      // @ts-expect-error - mock logger
      logger: mockLogger,
      // @ts-expect-error - mock repository
      repository: mockRepository,
      // @ts-expect-error - mock team repository
      teamRepository: mockTeamRepository,
      // @ts-expect-error - mock billing service
      billingService: mockBillingService,
      // @ts-expect-error - mock features repository
      featuresRepository: mockFeaturesRepository,
    });
  });

  describe("shouldApplyHighWaterMark", () => {
    it("returns false when feature flag is disabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const result = await service.shouldApplyHighWaterMark(123);

      expect(result).toBe(false);
      expect(mockRepository.getByTeamId).not.toHaveBeenCalled();
    });

    it("returns false when no billing record exists", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getByTeamId.mockResolvedValue(null);

      const result = await service.shouldApplyHighWaterMark(123);

      expect(result).toBe(false);
    });

    it("returns false for annual billing", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getByTeamId.mockResolvedValue({ billingPeriod: "ANNUAL" });

      const result = await service.shouldApplyHighWaterMark(123);

      expect(result).toBe(false);
    });

    it("returns true for monthly billing with feature enabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getByTeamId.mockResolvedValue({ billingPeriod: "MONTHLY" });

      const result = await service.shouldApplyHighWaterMark(123);

      expect(result).toBe(true);
    });

    it("returns false and logs error when exception occurs", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockRejectedValue(new Error("DB error"));

      const result = await service.shouldApplyHighWaterMark(123);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("updateHighWaterMarkOnSeatAddition", () => {
    const teamId = 123;
    const currentPeriodStart = new Date("2024-01-01");

    it("returns null when shouldApplyHighWaterMark returns false", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const result = await service.updateHighWaterMarkOnSeatAddition({
        teamId,
        currentPeriodStart,
      });

      expect(result).toBeNull();
    });

    it("returns null when no billing record found", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getByTeamId.mockResolvedValueOnce({ billingPeriod: "MONTHLY" });
      mockRepository.getByTeamId.mockResolvedValueOnce(null);

      const result = await service.updateHighWaterMarkOnSeatAddition({
        teamId,
        currentPeriodStart,
      });

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("returns null when member count cannot be retrieved", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getByTeamId.mockResolvedValue({
        billingPeriod: "MONTHLY",
        isOrganization: false,
      });
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(null);

      const result = await service.updateHighWaterMarkOnSeatAddition({
        teamId,
        currentPeriodStart,
      });

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("updates HWM and returns result when successful", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getByTeamId.mockResolvedValue({
        billingPeriod: "MONTHLY",
        isOrganization: false,
      });
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(5);
      mockRepository.updateIfHigher.mockResolvedValue({
        updated: true,
        previousHighWaterMark: 3,
      });

      const result = await service.updateHighWaterMarkOnSeatAddition({
        teamId,
        currentPeriodStart,
      });

      expect(result).toEqual({
        updated: true,
        previousHighWaterMark: 3,
        newHighWaterMark: 5,
      });
      expect(mockRepository.updateIfHigher).toHaveBeenCalledWith({
        teamId,
        isOrganization: false,
        newSeatCount: 5,
        periodStart: currentPeriodStart,
      });
    });
  });

  describe("applyHighWaterMarkToSubscription", () => {
    const subscriptionId = "sub_123";

    it("returns false when feature flag is disabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("returns false when billing service is not configured", async () => {
      const serviceWithoutBilling = new HighWaterMarkService({
        // @ts-expect-error - mock logger
        logger: mockLogger,
        // @ts-expect-error - mock repository
        repository: mockRepository,
        // @ts-expect-error - mock team repository
        teamRepository: mockTeamRepository,
        billingService: undefined,
        // @ts-expect-error - mock features repository
        featuresRepository: mockFeaturesRepository,
      });
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const result = await serviceWithoutBilling.applyHighWaterMarkToSubscription(subscriptionId);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("returns false when no billing record found", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue(null);

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("returns false for non-monthly billing", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        billingPeriod: "ANNUAL",
      });

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("returns false when HWM equals paidSeats (no update needed)", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        teamId: 123,
        subscriptionItemId: "si_123",
        isOrganization: false,
        billingPeriod: "MONTHLY",
        highWaterMark: 5,
        paidSeats: 5,
      });

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(result).toBe(false);
      expect(mockBillingService.handleSubscriptionUpdate).not.toHaveBeenCalled();
    });

    it("lazy initializes HWM when null", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        teamId: 123,
        subscriptionItemId: "si_123",
        isOrganization: false,
        billingPeriod: "MONTHLY",
        highWaterMark: null,
        paidSeats: 5,
        subscriptionStart: new Date("2024-01-01"),
      });
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(5);

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(mockRepository.reset).toHaveBeenCalled();
      expect(result).toBe(false); // HWM (5) equals paidSeats (5) after init
    });

    it("syncs paidSeats from Stripe when null", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        teamId: 123,
        subscriptionItemId: "si_123",
        isOrganization: false,
        billingPeriod: "MONTHLY",
        highWaterMark: 6,
        paidSeats: null,
      });
      mockBillingService.getSubscription.mockResolvedValue({
        items: [{ quantity: 4 }],
      });

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(mockRepository.updateQuantityAfterStripeSync).toHaveBeenCalledWith({
        teamId: 123,
        isOrganization: false,
        paidSeats: 4,
      });
      expect(result).toBe(true); // HWM (6) > paidSeats (4) -> scale up
    });

    it("scales up subscription when HWM > paidSeats", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        teamId: 123,
        subscriptionItemId: "si_123",
        isOrganization: false,
        billingPeriod: "MONTHLY",
        highWaterMark: 8,
        paidSeats: 5,
      });

      const result = await service.applyHighWaterMarkToSubscription(subscriptionId);

      expect(result).toBe(true);
      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId,
        subscriptionItemId: "si_123",
        membershipCount: 8,
        prorationBehavior: "none",
      });
      expect(mockRepository.updateQuantityAfterStripeSync).toHaveBeenCalledWith({
        teamId: 123,
        isOrganization: false,
        paidSeats: 8,
      });
    });
  });

  describe("resetSubscriptionAfterRenewal", () => {
    const subscriptionId = "sub_123";
    const newPeriodStart = new Date("2024-02-01");

    it("returns false when feature flag is disabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const result = await service.resetSubscriptionAfterRenewal({
        subscriptionId,
        newPeriodStart,
      });

      expect(result).toBe(false);
    });

    it("returns false when billing service is not configured", async () => {
      const serviceWithoutBilling = new HighWaterMarkService({
        // @ts-expect-error - mock logger
        logger: mockLogger,
        // @ts-expect-error - mock repository
        repository: mockRepository,
        // @ts-expect-error - mock team repository
        teamRepository: mockTeamRepository,
        billingService: undefined,
        // @ts-expect-error - mock features repository
        featuresRepository: mockFeaturesRepository,
      });
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const result = await serviceWithoutBilling.resetSubscriptionAfterRenewal({
        subscriptionId,
        newPeriodStart,
      });

      expect(result).toBe(false);
    });

    it("returns false for non-monthly billing", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        billingPeriod: "ANNUAL",
      });

      const result = await service.resetSubscriptionAfterRenewal({
        subscriptionId,
        newPeriodStart,
      });

      expect(result).toBe(false);
    });

    it("resets HWM but returns false when memberCount equals paidSeats", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        teamId: 123,
        subscriptionItemId: "si_123",
        isOrganization: false,
        billingPeriod: "MONTHLY",
        paidSeats: 5,
      });
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(5);

      const result = await service.resetSubscriptionAfterRenewal({
        subscriptionId,
        newPeriodStart,
      });

      expect(result).toBe(false);
      expect(mockRepository.reset).toHaveBeenCalledWith({
        teamId: 123,
        isOrganization: false,
        currentSeatCount: 5,
        newPeriodStart,
      });
      expect(mockBillingService.handleSubscriptionUpdate).not.toHaveBeenCalled();
    });

    it("scales down subscription when memberCount < paidSeats", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockRepository.getBySubscriptionId.mockResolvedValue({
        teamId: 123,
        subscriptionItemId: "si_123",
        isOrganization: false,
        billingPeriod: "MONTHLY",
        paidSeats: 8,
      });
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(5);

      const result = await service.resetSubscriptionAfterRenewal({
        subscriptionId,
        newPeriodStart,
      });

      expect(result).toBe(true);
      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId,
        subscriptionItemId: "si_123",
        membershipCount: 5,
        prorationBehavior: "none",
      });
      expect(mockRepository.reset).toHaveBeenCalledWith({
        teamId: 123,
        isOrganization: false,
        currentSeatCount: 5,
        newPeriodStart,
      });
      expect(mockRepository.updateQuantityAfterStripeSync).toHaveBeenCalledWith({
        teamId: 123,
        isOrganization: false,
        paidSeats: 5,
      });
    });
  });

  describe("resetHighWaterMark", () => {
    it("returns early when member count cannot be retrieved", async () => {
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(null);

      await service.resetHighWaterMark({
        teamId: 123,
        isOrganization: false,
        newPeriodStart: new Date(),
      });

      expect(mockRepository.reset).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("resets HWM to current member count", async () => {
      mockTeamRepository.getTeamMemberCount.mockResolvedValue(4);
      const newPeriodStart = new Date("2024-02-01");

      await service.resetHighWaterMark({
        teamId: 123,
        isOrganization: false,
        newPeriodStart,
      });

      expect(mockRepository.reset).toHaveBeenCalledWith({
        teamId: 123,
        isOrganization: false,
        currentSeatCount: 4,
        newPeriodStart,
      });
    });
  });

  describe("getHighWaterMarkData", () => {
    it("delegates to repository", async () => {
      const mockData = { highWaterMark: 5, paidSeats: 5 };
      mockRepository.getByTeamId.mockResolvedValue(mockData);

      const result = await service.getHighWaterMarkData(123);

      expect(result).toBe(mockData);
      expect(mockRepository.getByTeamId).toHaveBeenCalledWith(123);
    });
  });
});
