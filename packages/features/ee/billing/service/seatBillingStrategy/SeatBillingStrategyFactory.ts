import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import logger from "@calcom/lib/logger";

import type { ActiveUserBillingService } from "../../active-user/services/ActiveUserBillingService";
import type { HighWaterMarkRepository } from "../../repository/highWaterMark/HighWaterMarkRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { BillingPeriodService } from "../billingPeriod/BillingPeriodService";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import type { HighWaterMarkService } from "../highWaterMark/HighWaterMarkService";
import type { MonthlyProrationService } from "../proration/MonthlyProrationService";
import { ActiveUserBillingStrategy } from "./ActiveUserBillingStrategy";
import { HighWaterMarkStrategy } from "./HighWaterMarkStrategy";
import { ImmediateUpdateStrategy } from "./ImmediateUpdateStrategy";
import type { ISeatBillingStrategy } from "./ISeatBillingStrategy";
import { MonthlyProrationStrategy } from "./MonthlyProrationStrategy";

const log = logger.getSubLogger({ prefix: ["SeatBillingStrategyFactory"] });

export interface ISeatBillingStrategyFactoryDeps {
  billingPeriodService: BillingPeriodService;
  featuresRepository: IFeaturesRepository;
  billingProviderService: IBillingProviderService;
  highWaterMarkRepository: HighWaterMarkRepository;
  highWaterMarkService: HighWaterMarkService;
  monthlyProrationService: MonthlyProrationService;
  teamBillingDataRepository: ITeamBillingDataRepository;
  activeUserBillingService: ActiveUserBillingService;
}

export class SeatBillingStrategyFactory {
  private readonly prorationStrategy: ISeatBillingStrategy;
  private readonly hwmStrategy: ISeatBillingStrategy;
  private readonly activeUserStrategy: ISeatBillingStrategy;
  private readonly fallback: ISeatBillingStrategy;

  constructor(private readonly deps: ISeatBillingStrategyFactoryDeps) {
    this.fallback = new ImmediateUpdateStrategy(deps.billingProviderService);
    this.prorationStrategy = new MonthlyProrationStrategy({
      monthlyProrationService: deps.monthlyProrationService,
    });
    this.hwmStrategy = new HighWaterMarkStrategy({
      highWaterMarkRepository: deps.highWaterMarkRepository,
      highWaterMarkService: deps.highWaterMarkService,
    });
    this.activeUserStrategy = new ActiveUserBillingStrategy({
      activeUserBillingService: deps.activeUserBillingService,
      billingProviderService: deps.billingProviderService,
      teamBillingDataRepository: deps.teamBillingDataRepository,
    });
  }

  async createByTeamId(teamId: number): Promise<ISeatBillingStrategy> {
    const info = await this.deps.billingPeriodService.getBillingPeriodInfo(teamId);

    if (!info.isInTrial && info.subscriptionStart) {
      if (info.billingMode === "ACTIVE_USERS") {
        const enabled =
          await this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally(
            "active-user-billing"
          );
        if (enabled) return this.activeUserStrategy;
      }
      if (info.billingPeriod === "ANNUALLY") {
        const enabled =
          await this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");
        if (enabled) return this.prorationStrategy;
      }
      if (info.billingPeriod === "MONTHLY") {
        const enabled = await this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("hwm-seating");
        if (enabled) return this.hwmStrategy;
      }
    }

    return this.fallback;
  }

  async createBySubscriptionId(subscriptionId: string): Promise<ISeatBillingStrategy> {
    const team = await this.deps.teamBillingDataRepository.findBySubscriptionId(subscriptionId);
    if (!team) {
      log.warn(`No team found for subscription ${subscriptionId}, using fallback strategy`);
      return this.fallback;
    }
    return this.createByTeamId(team.id);
  }
}
