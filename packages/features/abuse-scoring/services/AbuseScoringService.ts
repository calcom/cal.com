import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { WatchlistType } from "@calcom/prisma/enums";
import type { AbuseAlerter } from "../lib/alerts";
import {
  ABUSE_MONITORING_WINDOW_DAYS,
  ABUSE_THRESHOLDS,
  ABUSE_WEIGHTS,
  MS_PER_DAY,
  SIGNUP_FLAG_CAP,
  VELOCITY_GATE_THRESHOLD,
} from "../lib/constants";
import { calculateScore } from "../lib/scoring";
import type { AbuseScoringRepository } from "../repositories/AbuseScoringRepository";
import type { AbuseFlag, AbuseMetadata, SignupCheckResult } from "../types";

const log = logger.getSubLogger({ prefix: ["abuse-scoring"] });

export type AbuseScoringServiceDeps = {
  repository: Pick<
    AbuseScoringRepository,
    | "findForScoring"
    | "findForMonitoring"
    | "findWatchlistPatterns"
    | "countRecentBookings"
    | "updateAbuseData"
  >;
  featuresRepository: Pick<
    FeaturesRepository,
    "checkIfFeatureIsEnabledGlobally"
  >;
  alerter: AbuseAlerter;
};

export class AbuseScoringService {
  private readonly repository: AbuseScoringServiceDeps["repository"];
  private readonly featuresRepository: AbuseScoringServiceDeps["featuresRepository"];
  private readonly alerter: AbuseScoringServiceDeps["alerter"];

  constructor(deps: AbuseScoringServiceDeps) {
    this.repository = deps.repository;
    this.featuresRepository = deps.featuresRepository;
    this.alerter = deps.alerter;
  }

  async checkSignup(email: string, name?: string): Promise<SignupCheckResult> {
    const enabled =
      await this.featuresRepository.checkIfFeatureIsEnabledGlobally(
        "abuse-scoring"
      );
    if (!enabled) return { flagged: false, flags: [], initialScore: 0 };

    const patterns = await this.repository.findWatchlistPatterns([
      WatchlistType.SPAM_KEYWORD,
      WatchlistType.SUSPICIOUS_DOMAIN,
      WatchlistType.EMAIL_PATTERN,
    ]);

    const flags: AbuseFlag[] = [];
    const emailDomain = email.split("@")[1]?.toLowerCase();
    const now = new Date().toISOString();

    for (const pattern of patterns) {
      switch (pattern.type) {
        case WatchlistType.SUSPICIOUS_DOMAIN:
          if (emailDomain === pattern.value.toLowerCase()) {
            flags.push({
              type: "suspicious_domain",
              domain: pattern.value,
              at: now,
            });
          }
          break;
        case WatchlistType.EMAIL_PATTERN:
          try {
            if (new RegExp(pattern.value).test(email)) {
              flags.push({
                type: "email_pattern",
                pattern: pattern.value,
                at: now,
              });
            }
          } catch {
            log.warn("Invalid regex pattern in watchlist", {
              pattern: pattern.value,
            });
          }
          break;
        case WatchlistType.SPAM_KEYWORD:
          if (name?.toLowerCase().includes(pattern.value.toLowerCase())) {
            flags.push({
              type: "spam_keyword",
              keyword: pattern.value,
              at: now,
            });
          }
          break;
      }
    }

    const flagged = flags.length > 0;
    const initialScore = Math.min(
      flags.length * ABUSE_WEIGHTS.signupFlag,
      SIGNUP_FLAG_CAP
    );

    if (flagged) {
      log.warn("Signup flagged", {
        emailDomain,
        flagCount: flags.length,
        initialScore,
      });
    }

    return { flagged, flags, initialScore };
  }

  async analyzeUser(userId: number, reason: string): Promise<void> {
    try {
      const cutoff = new Date(
        Date.now() - ABUSE_MONITORING_WINDOW_DAYS * MS_PER_DAY
      );
      const user = await this.repository.findForScoring(userId, cutoff);
      if (!user) return;

      if (!user.abuseData?.flags?.length) {
        // Only log when abuseData exists but flags are missing — null abuseData is expected for unflagged users
        if (user.abuseData != null) {
          log.warn("analyzeUser skipped: abuseData present but no flags", {
            userId,
            reason,
          });
        }
        return;
      }
      if (user.locked) return;

      const patterns = await this.repository.findWatchlistPatterns([
        WatchlistType.SPAM_KEYWORD,
        WatchlistType.REDIRECT_DOMAIN,
      ]);
      const spamKeywords = patterns
        .filter((p) => p.type === WatchlistType.SPAM_KEYWORD)
        .map((p) => p.value.toLowerCase());
      const maliciousDomains = new Set(
        patterns
          .filter((p) => p.type === WatchlistType.REDIRECT_DOMAIN)
          .map((p) => p.value.toLowerCase())
      );

      const { score, signals } = calculateScore(
        user,
        maliciousDomains,
        spamKeywords
      );

      const shouldLock = score >= ABUSE_THRESHOLDS.lock;

      const updatedAbuse: AbuseMetadata = {
        flags: user.abuseData?.flags ?? [],
        signals,
      };

      const now = new Date();
      // undefined skips the locked field in the update — never unlocks a user locked by another process
      await this.repository.updateAbuseData(userId, {
        score,
        abuseData: updatedAbuse,
        lastAnalyzedAt: now,
        locked: shouldLock || undefined,
        ...(shouldLock && {
          lockedAt: now,
          lockedReason: "score_threshold" as const,
        }),
      });

      log.info("User analyzed", {
        userId,
        score,
        signalCount: signals.length,
        locked: shouldLock,
        reason,
      });

      if (shouldLock) {
        await this.alerter.send({
          type: "user_locked",
          userId,
          score,
          signals,
          reason,
        });
      } else if (score >= ABUSE_THRESHOLDS.alert) {
        await this.alerter.send({
          type: "user_suspicious",
          userId,
          score,
          signals,
          reason,
        });
      }
    } catch (error) {
      log.error("analyzeUser failed", { userId, reason, error });
    }
  }

  /** Gate 2: check if EventType content should be scanned. Does NOT require flags. */
  async shouldUsersCheckEventType(userId: number): Promise<boolean> {
    const enabled =
      await this.featuresRepository.checkIfFeatureIsEnabledGlobally(
        "abuse-scoring"
      );
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const ageMs = Date.now() - user.createdDate.getTime();
    if (ageMs > ABUSE_MONITORING_WINDOW_DAYS * MS_PER_DAY) return false;

    return true;
  }

  /** Gate 3: velocity check for unflagged accounts < 7 days. */
  async checkBookingVelocity(userId: number): Promise<boolean> {
    const enabled =
      await this.featuresRepository.checkIfFeatureIsEnabledGlobally(
        "abuse-scoring"
      );
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const ageMs = Date.now() - user.createdDate.getTime();
    if (ageMs > ABUSE_MONITORING_WINDOW_DAYS * MS_PER_DAY) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.repository.countRecentBookings(userId, oneHourAgo);
    return count > VELOCITY_GATE_THRESHOLD;
  }

  /** Monitor check — requires flags (used for already-flagged users). */
  async shouldMonitor(userId: number): Promise<boolean> {
    const enabled =
      await this.featuresRepository.checkIfFeatureIsEnabledGlobally(
        "abuse-scoring"
      );
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const ageMs = Date.now() - user.createdDate.getTime();
    if (ageMs > ABUSE_MONITORING_WINDOW_DAYS * MS_PER_DAY) return false;

    return Boolean(user.abuseData?.flags?.length);
  }
}
