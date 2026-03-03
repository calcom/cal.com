import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import logger from "@calcom/lib/logger";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { ISeatBillingStrategy } from "../seatBillingStrategy/ISeatBillingStrategy";
import type { SeatBillingStrategyFactory } from "../seatBillingStrategy/SeatBillingStrategyFactory";
import { DunningAwareStrategy } from "./DunningAwareStrategy";
import type { DunningServiceFactory } from "./DunningServiceFactory";

const log = logger.getSubLogger({ prefix: ["DunningStrategyFactory"] });

export interface IDunningStrategyFactoryDeps {
  inner: SeatBillingStrategyFactory;
  dunningServiceFactory: DunningServiceFactory;
  featuresRepository: IFeaturesRepository;
  teamBillingDataRepository: ITeamBillingDataRepository;
}

export class DunningStrategyFactory {
  constructor(private readonly deps: IDunningStrategyFactoryDeps) {}

  async createByTeamId(teamId: number, subscriptionId?: string): Promise<ISeatBillingStrategy> {
    const strategy = await this.deps.inner.createByTeamId(teamId);
    return this.wrapIfEnabled(strategy, teamId, subscriptionId);
  }

  async createBySubscriptionId(subscriptionId: string): Promise<ISeatBillingStrategy> {
    const team = await this.deps.teamBillingDataRepository.findBySubscriptionId(subscriptionId);
    if (!team) {
      log.warn(`No team found for subscription ${subscriptionId}, delegating to inner factory`);
      return this.deps.inner.createBySubscriptionId(subscriptionId);
    }
    return this.createByTeamId(team.id, subscriptionId);
  }

  private async wrapIfEnabled(
    inner: ISeatBillingStrategy,
    teamId: number,
    subscriptionId?: string
  ): Promise<ISeatBillingStrategy> {
    const dunningEnabled =
      await this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("dunning-enforcement");
    if (!dunningEnabled) return inner;

    const resolved = await this.deps.dunningServiceFactory.forTeam(teamId);
    if (!resolved) return inner;

    return new DunningAwareStrategy({
      inner,
      dunningService: resolved.service,
      billingId: resolved.billingId,
      teamId,
      subscriptionId: subscriptionId ?? "",
    });
  }
}
