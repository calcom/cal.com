import { beforeEach, describe, expect, it, vi } from "vitest";

import { WatchlistType } from "@calcom/prisma/enums";
import { ABUSE_WEIGHTS, SIGNUP_FLAG_CAP, VELOCITY_GATE_THRESHOLD } from "../lib/constants";
import type { AbuseScoringServiceDeps } from "../services/AbuseScoringService";
import { AbuseScoringService } from "../services/AbuseScoringService";

function buildMockRepository(): AbuseScoringServiceDeps["repository"] {
  return {
    findForScoring: vi.fn().mockResolvedValue(null),
    findForMonitoring: vi.fn().mockResolvedValue(null),
    findWatchlistPatterns: vi.fn().mockResolvedValue([]),
    countRecentBookings: vi.fn().mockResolvedValue(0),
    updateAbuseData: vi.fn(),
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

  // ── checkSignup ──

  describe("checkSignup", () => {
    it("returns unflagged when feature flag is OFF", async () => {
      featuresRepository = buildMockFeaturesRepository(false);
      service = new AbuseScoringService({ repository, featuresRepository, alerter });

      const result = await service.checkSignup("user@example.com");
      expect(result).toEqual({ flagged: false, flags: [], initialScore: 0 });
      expect(repository.findWatchlistPatterns).not.toHaveBeenCalled();
    });

    it("flags suspicious domain match", async () => {
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.SUSPICIOUS_DOMAIN, value: "tempmail.org" },
      ]);

      const result = await service.checkSignup("bot@tempmail.org");
      expect(result.flagged).toBe(true);
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe("suspicious_domain");
      expect(result.initialScore).toBe(ABUSE_WEIGHTS.signupFlag);
    });

    it("flags spam keyword in name", async () => {
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.SPAM_KEYWORD, value: "bitcoin" },
      ]);

      const result = await service.checkSignup("user@gmail.com", "Free Bitcoin");
      expect(result.flagged).toBe(true);
      expect(result.flags[0].type).toBe("spam_keyword");
    });

    it("caps initial score at SIGNUP_FLAG_CAP", async () => {
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.SUSPICIOUS_DOMAIN, value: "tempmail.org" },
        { type: WatchlistType.SPAM_KEYWORD, value: "bitcoin" },
        { type: WatchlistType.SPAM_KEYWORD, value: "airdrop" },
      ]);

      const result = await service.checkSignup("bot@tempmail.org", "Free Bitcoin Airdrop");
      expect(result.initialScore).toBe(SIGNUP_FLAG_CAP);
    });

    it("does not flag clean email and name", async () => {
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.SUSPICIOUS_DOMAIN, value: "tempmail.org" },
        { type: WatchlistType.SPAM_KEYWORD, value: "bitcoin" },
      ]);

      const result = await service.checkSignup("john@gmail.com", "John Smith");
      expect(result.flagged).toBe(false);
      expect(result.flags).toHaveLength(0);
    });

    it("handles invalid regex pattern gracefully", async () => {
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.EMAIL_PATTERN, value: "[invalid" },
      ]);

      const result = await service.checkSignup("user@example.com");
      expect(result.flagged).toBe(false);
    });
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
        abuseData: {
          flags: [{ type: "suspicious_domain", at: "2026-02-10" }],
          signals: [],
        },
        createdDate: recentDate(1),
        locked: true,
      });

      expect(await service.shouldMonitor(1)).toBe(false);
    });

    it("returns false when account is older than 7 days", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: {
          flags: [{ type: "suspicious_domain", at: "2026-02-10" }],
          signals: [],
        },
        createdDate: recentDate(10),
        locked: false,
      });

      expect(await service.shouldMonitor(1)).toBe(false);
    });

    it("returns false when user has no flags", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: { flags: [], signals: [] },
        createdDate: recentDate(1),
        locked: false,
      });

      expect(await service.shouldMonitor(1)).toBe(false);
    });

    it("returns true for flagged user within monitoring window", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: {
          flags: [{ type: "suspicious_domain", domain: "tempmail.org", at: "2026-02-10" }],
          signals: [],
        },
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

    it("returns true for any user within 7-day window (no flag required)", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: null,
        createdDate: recentDate(3),
        locked: false,
      });

      expect(await service.shouldUsersCheckEventType(1)).toBe(true);
    });

    it("returns false for account older than 7 days", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: null,
        createdDate: recentDate(10),
        locked: false,
      });

      expect(await service.shouldUsersCheckEventType(1)).toBe(false);
    });

    it("returns false when user is locked", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: null,
        createdDate: recentDate(1),
        locked: true,
      });

      expect(await service.shouldUsersCheckEventType(1)).toBe(false);
    });
  });

  // ── checkBookingVelocity ──

  describe("checkBookingVelocity", () => {
    const recentUser = { abuseData: null, createdDate: recentDate(2), locked: false };

    it("returns false when feature flag is OFF", async () => {
      featuresRepository = buildMockFeaturesRepository(false);
      service = new AbuseScoringService({ repository, featuresRepository, alerter });

      expect(await service.checkBookingVelocity(1)).toBe(false);
      expect(repository.countRecentBookings).not.toHaveBeenCalled();
    });

    it("returns false for account older than 7 days", async () => {
      vi.mocked(repository.findForMonitoring).mockResolvedValue({
        abuseData: null,
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
    const flaggedAbuseData = {
      flags: [{ type: "suspicious_domain" as const, domain: "tempmail.org", at: "2026-02-10" }],
      signals: [],
    };

    function buildScoringUser(overrides = {}) {
      return {
        id: 1,
        email: "bot@tempmail.org",
        abuseData: flaggedAbuseData,
        locked: false,
        abuseScore: 0,
        eventTypes: [],
        bookings: [],
        ...overrides,
      };
    }

    it("skips non-existent user", async () => {
      await service.analyzeUser(999, "test");
      expect(repository.updateAbuseData).not.toHaveBeenCalled();
    });

    it("skips user with no flags", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(
        buildScoringUser({ abuseData: { flags: [], signals: [] } })
      );
      await service.analyzeUser(1, "test");
      expect(repository.updateAbuseData).not.toHaveBeenCalled();
    });

    it("skips already locked user", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser({ locked: true }));
      await service.analyzeUser(1, "test");
      expect(repository.updateAbuseData).not.toHaveBeenCalled();
    });

    it("calculates score and updates abuse data", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());

      await service.analyzeUser(1, "signup_flagged");

      expect(repository.updateAbuseData).toHaveBeenCalledWith(1, expect.objectContaining({ score: 10 }));
    });

    it("locks user and sends alert when score >= 80", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(
        buildScoringUser({
          abuseData: {
            flags: [
              { type: "suspicious_domain" as const, domain: "t1.org", at: "2026-02-10" },
              { type: "suspicious_domain" as const, domain: "t2.org", at: "2026-02-10" },
            ],
            signals: [],
            lastAnalyzedAt: null,
          },
          eventTypes: [
            {
              id: 1,
              userId: 1,
              title: "Free Bitcoin Airdrop",
              successRedirectUrl: "https://phishing.com/hook",
              forwardParamsSuccessRedirect: true,
            },
          ],
        })
      );
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.SPAM_KEYWORD, value: "bitcoin" },
        { type: WatchlistType.REDIRECT_DOMAIN, value: "phishing.com" },
      ]);

      await service.analyzeUser(1, "test");

      // signup(20) + content_spam(25) + redirect(30) + forward_params(15) = 90 >= 80
      expect(repository.updateAbuseData).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ locked: true, score: 90 })
      );
      expect(alerter.send).toHaveBeenCalledWith(expect.objectContaining({ type: "user_locked" }));
    });

    it("sends suspicious alert when score >= 50 but < 80", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(
        buildScoringUser({
          eventTypes: [
            {
              id: 1,
              userId: 1,
              title: "Free Bitcoin",
              successRedirectUrl: "https://phishing.com/hook",
              forwardParamsSuccessRedirect: false,
            },
          ],
        })
      );
      vi.mocked(repository.findWatchlistPatterns).mockResolvedValue([
        { type: WatchlistType.SPAM_KEYWORD, value: "bitcoin" },
        { type: WatchlistType.REDIRECT_DOMAIN, value: "phishing.com" },
      ]);

      await service.analyzeUser(1, "test");

      // signup(10) + content_spam(25) + redirect(30) = 65 >= 50
      expect(alerter.send).toHaveBeenCalledWith(expect.objectContaining({ type: "user_suspicious" }));
    });

    it("does not alert when score < 50", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());

      await service.analyzeUser(1, "test");

      expect(alerter.send).not.toHaveBeenCalled();
    });

    it("never sets locked to false on update", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());

      await service.analyzeUser(1, "test");

      const updateCall = vi.mocked(repository.updateAbuseData).mock.calls[0];
      // score 10 < 80, shouldLock=false → locked should be undefined (not false)
      expect(updateCall[1].locked).toBeUndefined();
    });

    it("fetches watchlist patterns in a single query", async () => {
      vi.mocked(repository.findForScoring).mockResolvedValue(buildScoringUser());

      await service.analyzeUser(1, "test");

      expect(repository.findWatchlistPatterns).toHaveBeenCalledTimes(1);
      expect(repository.findWatchlistPatterns).toHaveBeenCalledWith([
        WatchlistType.SPAM_KEYWORD,
        WatchlistType.REDIRECT_DOMAIN,
      ]);
    });

    it("swallows errors to maintain fail-open behavior", async () => {
      vi.mocked(repository.findForScoring).mockRejectedValue(new Error("db down"));

      await expect(service.analyzeUser(1, "test")).resolves.toBeUndefined();
      expect(repository.updateAbuseData).not.toHaveBeenCalled();
    });
  });
});
