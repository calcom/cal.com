import type { IFeatureRepository } from "@calcom/features/flags/repositories/PrismaFeatureRepository";
import logger from "@calcom/lib/logger";

import type { AbuseAlerter } from "../lib/alerts";
import { MS_PER_DAY, VELOCITY_GATE_THRESHOLD } from "../lib/constants";
import { evaluateRules, extractMetrics } from "../lib/scoring";
import type { AbuseScoringRepository } from "../repositories/AbuseScoringRepository";

const log = logger.getSubLogger({ prefix: ["abuse-scoring"] });

export type AbuseScoringServiceDeps = {
  repository: Pick<
    AbuseScoringRepository,
    | "findForScoring"
    | "findForMonitoring"
    | "countRecentBookings"
    | "updateAnalysis"
    | "findEnabledRules"
    | "findConfig"
  >;
  featuresRepository: Pick<IFeatureRepository, "checkIfFeatureIsEnabledGlobally">;
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

  async analyzeUser(userId: number, reason: string): Promise<void> {
    try {
      const [config, rules] = await Promise.all([
        this.repository.findConfig(),
        this.repository.findEnabledRules(),
      ]);

      const cutoff = new Date(Date.now() - config.monitoringWindowDays * MS_PER_DAY);
      const user = await this.repository.findForScoring(userId, cutoff);
      if (!user) return;
      if (user.locked) return;

      const metrics = extractMetrics(user);
      const result = evaluateRules(metrics, rules);

      const shouldLock = result.shouldAutoLock || result.score >= config.lockThreshold;
      const now = new Date();
      const lockedReason = result.shouldAutoLock ? "auto_lock_rule" : "score_threshold";

      const signals = result.matchedRules.map((r) => ({
        type: `rule_${r.groupId}`,
        weight: r.weight,
        context: r.description,
      }));

      await this.repository.updateAnalysis(userId, {
        score: result.score,
        signals,
        lastAnalyzedAt: now,
        locked: shouldLock || undefined,
        ...(shouldLock && { lockedAt: now, lockedReason }),
      });

      log.info("User analyzed", {
        userId,
        score: result.score,
        signalCount: signals.length,
        locked: shouldLock,
        reason,
      });

      if (shouldLock) {
        await this.alerter.send({
          type: "user_locked",
          userId,
          score: result.score,
          signals,
          reason,
        });
      } else if (result.score >= config.alertThreshold) {
        await this.alerter.send({
          type: "user_suspicious",
          userId,
          score: result.score,
          signals,
          reason,
        });
      }
    } catch (error) {
      log.error("analyzeUser failed", { userId, reason, error });
    }
  }

  private async getMonitoringWindowMs(): Promise<number> {
    const config = await this.repository.findConfig();
    return config.monitoringWindowDays * MS_PER_DAY;
  }

  async shouldUsersCheckEventType(userId: number): Promise<boolean> {
    const enabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("abuse-scoring");
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const windowMs = await this.getMonitoringWindowMs();
    return Date.now() - user.createdDate.getTime() <= windowMs;
  }

  async shouldAnalyzeOnBooking(userId: number): Promise<boolean> {
    const enabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("abuse-scoring");
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const windowMs = await this.getMonitoringWindowMs();
    return Date.now() - user.createdDate.getTime() <= windowMs;
  }

  async checkBookingVelocity(userId: number): Promise<boolean> {
    const enabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("abuse-scoring");
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const windowMs = await this.getMonitoringWindowMs();
    if (Date.now() - user.createdDate.getTime() > windowMs) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.repository.countRecentBookings(userId, oneHourAgo);
    return count > VELOCITY_GATE_THRESHOLD;
  }

  async shouldMonitor(userId: number): Promise<boolean> {
    const enabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("abuse-scoring");
    if (!enabled) return false;

    const user = await this.repository.findForMonitoring(userId);
    if (!user || user.locked) return false;

    const windowMs = await this.getMonitoringWindowMs();
    return Date.now() - user.createdDate.getTime() <= windowMs;
  }
}
