import { beforeEach, describe, expect, it, vi } from "vitest";

import { VELOCITY_GATE_THRESHOLD } from "../lib/constants";
import type { AbuseScoringServiceDeps } from "../services/AbuseScoringService";
import { AbuseScoringService } from "../services/AbuseScoringService";

/** Generates a deterministic UUID v7-shaped string from a number, for readable test fixtures. */
function uuid(n: number): string {
  return `019577a0-0000-7000-8000-${String(n).padStart(12, "0")}`;
}

const DEFAULT_CONFIG = {
  alertThreshold: 50,
  lockThreshold: 80,
  monitoringWindowDays: 7,
};

function buildMockRepository(): AbuseScoringServiceDeps["repository"] {
  return {
    findForScoring: vi.fn().mockResolvedValue(null),
    findForMonitoring: vi.fn().mockResolvedValue(null),
    countRecentBookings: vi.fn().mockResolvedValue(0),
    updateAnalysis: vi.fn(),
    findEnabledRules: vi.fn().mockResolvedValue([]),
    findConfig: vi.fn().mockResolvedValue(DEFAULT_CONFIG),
  };
}

function buildMockFeaturesRepository(enabled = true): AbuseScoringServiceDeps["featuresRepository"] {
  return {
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(enabled),
  };
}

function buildMockAlerter(): AbuseScoringServiceDeps["alerter"] {
  return { send: vi.fn() };
}

function recentDate(daysAgo = 0) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

describe("AbuseScoringService", () => {
  let repository: ReturnType<typeof buildMockRepository>;
  let featuresRepository: ReturnType<typeof buildMockFeaturesRepository>;
  let alerter: ReturnType<typeof buildMockAlerter>;
  let service: AbuseScoringService;

  beforeEach(() => {
    vi.restoreAllMocks();
    repository = buildMockRepository();
    featuresRepository = buildMockFeaturesRepository();
    alerter = buildMockAlerter();
    service = new AbuseScoringService({ repository, featuresRepository, alerter });
  });

  // ── shouldMonitor ──

  describe("shouldMonitor", () => {
    it("returns false when feature flag is OFF", async () => {
      featuresRepository = buildMockFeaturesRepository(false);
      service = new AbuseScoringService({ repository, featuresRepository, alerter });

      expect(await service.shouldMonitor(1)).toBe(false);
      expect(repository.findForMonitoring).not.toHaveBeenCalled();
    });

    it("returns false when user not found", async () => {
      expect(await service.shouldMonitor(999)).toBe(false);
    });

    it("returns false when user is locked", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(1),
        locked: true,
      });

      expect(await service.shouldMonitor(1)).toBe(false);
    });

    it("returns false when account is older than monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(10),
        locked: false,
      });

      expect(await service.shouldMonitor(1)).toBe(false);
    });

    it("returns true for user within monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(2),
        locked: false,
      });

      expect(await service.shouldMonitor(1)).toBe(true);
    });
  });

  // ── shouldUsersCheckEventType ──

  describe("shouldUsersCheckEventType", () => {
    it("returns false when feature flag is OFF", async () => {
      featuresRepository = buildMockFeaturesRepository(false);
      service = new AbuseScoringService({ repository, featuresRepository, alerter });

      expect(await service.shouldUsersCheckEventType(1)).toBe(false);
    });

    it("returns true for any user within monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(3),
        locked: false,
      });

      expect(await service.shouldUsersCheckEventType(1)).toBe(true);
    });

    it("returns false for account older than monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(10),
        locked: false,
      });

      expect(await service.shouldUsersCheckEventType(1)).toBe(false);
    });

    it("returns false when user is locked", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(1),
        locked: true,
      });

      expect(await service.shouldUsersCheckEventType(1)).toBe(false);
    });
  });

  // ── shouldAnalyzeOnBooking ──

  describe("shouldAnalyzeOnBooking", () => {
    it("returns false when feature flag is OFF", async () => {
      featuresRepository = buildMockFeaturesRepository(false);
      service = new AbuseScoringService({ repository, featuresRepository, alerter });

      expect(await service.shouldAnalyzeOnBooking(1)).toBe(false);
    });

    it("returns true for any user within monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(3),
        locked: false,
      });

      expect(await service.shouldAnalyzeOnBooking(1)).toBe(true);
    });

    it("returns false for account older than monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(10),
        locked: false,
      });

      expect(await service.shouldAnalyzeOnBooking(1)).toBe(false);
    });

    it("returns false when user not found", async () => {
      expect(await service.shouldAnalyzeOnBooking(999)).toBe(false);
    });
  });

  // ── checkBookingVelocity ──

  describe("checkBookingVelocity", () => {
    const recentUser = { createdDate: recentDate(2), locked: false };

    it("returns false when feature flag is OFF", async () => {
      featuresRepository = buildMockFeaturesRepository(false);
      service = new AbuseScoringService({ repository, featuresRepository, alerter });

      expect(await service.checkBookingVelocity(1)).toBe(false);
      expect(repository.countRecentBookings).not.toHaveBeenCalled();
    });

    it("returns false for account older than monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        createdDate: recentDate(10),
        locked: false,
      });

      expect(await service.checkBookingVelocity(1)).toBe(false);
      expect(repository.countRecentBookings).not.toHaveBeenCalled();
    });

    it("returns true when count exceeds threshold", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue(recentUser);
      vi.mocked(repository.countRecentBookings).mockResolvedValue(VELOCITY_GATE_THRESHOLD + 1);
      expect(await service.checkBookingVelocity(1)).toBe(true);
    });

    it("returns false at threshold boundary", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue(recentUser);
      vi.mocked(repository.countRecentBookings).mockResolvedValue(VELOCITY_GATE_THRESHOLD);
      expect(await service.checkBookingVelocity(1)).toBe(false);
    });
  });

  // ── analyzeUser ──

  describe("analyzeUser", () => {
    function buildScoringUser(overrides = {}) {
      return {
        id: 1,
        email: "bot@tempmail.org",
        name: null,
        username: null,
        locked: false,
        abuseScore: 0,
        eventTypes: [],
        bookings: [],
        ...overrides,
      };
    }

    it("skips non-existent user", async () => {
      await service.analyzeUser(999, "test");
      expect(repository.updateAnalysis).not.toHaveBeenCalled();
    });

    it("skips already locked user", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser({ locked: true }));
      await service.analyzeUser(1, "test");
      expect(repository.updateAnalysis).not.toHaveBeenCalled();
    });

    it("evaluates rules and updates analysis", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());
      vi.mocked(repository.findEnabledRules).mockResolvedValue([
        {
          id: uuid(10),
          matchAll: true,
          weight: 10,
          autoLock: false,
          description: "Suspicious domain",
          conditions: [{ id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN" as const, operator: "EXACT" as const, value: "tempmail.org" }],
        },
      ]);

      await service.analyzeUser(1, "test");

      expect(repository.updateAnalysis).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          score: 10,
          signals: [{ type: `rule_${uuid(10)}`, weight: 10, context: "Suspicious domain" }],
        })
      );
    });

    it("locks user and sends alert when score >= lockThreshold", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(
        buildScoringUser({
          eventTypes: [
            { id: 1, userId: 1, title: "Free Bitcoin Airdrop", description: null, successRedirectUrl: null, forwardParamsSuccessRedirect: null },
          ],
        })
      );
      vi.mocked(repository.findEnabledRules).mockResolvedValue([
        {
          id: uuid(1),
          matchAll: true,
          weight: 50,
          autoLock: false,
          description: "Spam title",
          conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE" as const, operator: "CONTAINS" as const, value: "bitcoin" }],
        },
        {
          id: uuid(2),
          matchAll: true,
          weight: 40,
          autoLock: false,
          description: "Airdrop title",
          conditions: [{ id: uuid(2), field: "EVENT_TYPE_TITLE" as const, operator: "CONTAINS" as const, value: "airdrop" }],
        },
      ]);

      await service.analyzeUser(1, "test");

      // 50 + 40 = 90 >= 80 (lockThreshold)
      expect(repository.updateAnalysis).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ score: 90, locked: true, lockedReason: "score_threshold" })
      );
      expect(alerter.send).toHaveBeenCalledWith(expect.objectContaining({ type: "user_locked" }));
    });

    it("locks user via autoLock rule", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(
        buildScoringUser({
          eventTypes: [
            { id: 1, userId: 1, title: "btc transaction claim", description: null, successRedirectUrl: null, forwardParamsSuccessRedirect: null },
          ],
        })
      );
      vi.mocked(repository.findEnabledRules).mockResolvedValue([
        {
          id: uuid(5),
          matchAll: true,
          weight: 0,
          autoLock: true,
          description: "Phishing title",
          conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE" as const, operator: "CONTAINS" as const, value: "btc transaction" }],
        },
      ]);

      await service.analyzeUser(1, "test");

      expect(repository.updateAnalysis).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ locked: true, lockedReason: "auto_lock_rule" })
      );
      expect(alerter.send).toHaveBeenCalledWith(expect.objectContaining({ type: "user_locked" }));
    });

    it("sends suspicious alert when score >= alertThreshold but < lockThreshold", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(
        buildScoringUser({
          eventTypes: [
            { id: 1, userId: 1, title: "Free Bitcoin", description: null, successRedirectUrl: null, forwardParamsSuccessRedirect: null },
          ],
        })
      );
      vi.mocked(repository.findEnabledRules).mockResolvedValue([
        {
          id: uuid(1),
          matchAll: true,
          weight: 60,
          autoLock: false,
          description: "Spam title",
          conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE" as const, operator: "CONTAINS" as const, value: "bitcoin" }],
        },
      ]);

      await service.analyzeUser(1, "test");

      // 60 >= 50 (alertThreshold) but < 80 (lockThreshold)
      expect(alerter.send).toHaveBeenCalledWith(expect.objectContaining({ type: "user_suspicious" }));
    });

    it("does not alert when score < alertThreshold", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());
      // No rules match → score = 0
      await service.analyzeUser(1, "test");
      expect(alerter.send).not.toHaveBeenCalled();
    });

    it("never sets locked to false on update", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());

      await service.analyzeUser(1, "test");

      const updateCall = vi.mocked(repository.updateAnalysis).mock.calls[0];
      // score 0 < 80, shouldLock=false → locked should be undefined (not false)
      expect(updateCall[1].locked).toBeUndefined();
    });

    it("swallows errors to maintain fail-open behavior", async () => {
      vi.mocked(repository.findConfig).mockRejectedValue(new Error("db down"));

      await expect(service.analyzeUser(1, "test")).resolves.toBeUndefined();
      expect(repository.updateAnalysis).not.toHaveBeenCalled();
    });
  });
});
