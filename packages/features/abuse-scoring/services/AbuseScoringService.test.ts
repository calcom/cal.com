import { describe, it, expect, vi } from "vitest";
import { AbuseScoringService } from "./AbuseScoringService";

const createMockDeps = () => ({
  repository: {
    findForScoring: vi.fn(),
    findForMonitoring: vi.fn(),
    countRecentBookings: vi.fn(),
    updateAnalysis: vi.fn(),
    findEnabledRules: vi.fn(),
    findConfig: vi.fn().mockResolvedValue({ monitoringWindowDays: 30, lockThreshold: 100, alertThreshold: 50 }),
  },
  featuresRepository: {
    checkIfFeatureIsEnabledGlobally: vi.fn(),
  },
  alerter: {
    send: vi.fn(),
  },
});

describe("AbuseScoringService", () => {
  describe("checkBookingVelocity", () => {
    it("returns false when user is locked", async () => {
      const deps = createMockDeps();
      deps.featuresRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      deps.repository.findForMonitoring.mockResolvedValue({ locked: true, createdDate: new Date() });
      const service = new AbuseScoringService(deps);
      const result = await service.checkBookingVelocity(1);
      expect(result).toBe(false);
    });

    it("returns false when user is null", async () => {
      const deps = createMockDeps();
      deps.featuresRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      deps.repository.findForMonitoring.mockResolvedValue(null);
      const service = new AbuseScoringService(deps);
      const result = await service.checkBookingVelocity(1);
      expect(result).toBe(false);
    });

    it("returns false when feature is disabled", async () => {
      const deps = createMockDeps();
      deps.featuresRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);
      const service = new AbuseScoringService(deps);
      const result = await service.checkBookingVelocity(1);
      expect(result).toBe(false);
    });
  });
});
