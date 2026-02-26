import { createContainer } from "@calcom/features/di/di";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { StripeBillingService } from "../../service/billingProvider/StripeBillingService";
import type { DunningServiceFactory } from "../../service/dunning/DunningServiceFactory";
import type { DunningStatusResolver } from "../../service/dunning/DunningStatusResolver";
import type { SeatBillingStrategyFactory } from "../../service/seatBillingStrategy/SeatBillingStrategyFactory";
import type { TeamBillingServiceFactory } from "../../service/teams/TeamBillingServiceFactory";
import { billingProviderServiceModuleLoader } from "../modules/BillingProviderService";
import { dunningServiceFactoryModuleLoader } from "../modules/DunningServiceFactory.module";
import { dunningStatusResolverModuleLoader } from "../modules/DunningStatusResolver.module";
import { seatBillingStrategyFactoryModuleLoader } from "../modules/SeatBillingStrategyFactory.module";
import { teamBillingServiceFactoryModuleLoader } from "../modules/TeamBillingServiceFactory";
import { DI_TOKENS } from "../tokens";

const billingContainer = createContainer();

teamBillingServiceFactoryModuleLoader.loadModule(billingContainer);
billingProviderServiceModuleLoader.loadModule(billingContainer);
seatBillingStrategyFactoryModuleLoader.loadModule(billingContainer);
dunningServiceFactoryModuleLoader.loadModule(billingContainer);
dunningStatusResolverModuleLoader.loadModule(billingContainer);

export function getTeamBillingServiceFactory(): TeamBillingServiceFactory {
  return billingContainer.get<TeamBillingServiceFactory>(DI_TOKENS.TEAM_BILLING_SERVICE_FACTORY);
}

export function getBillingProviderService(): StripeBillingService {
  return billingContainer.get<StripeBillingService>(DI_TOKENS.BILLING_PROVIDER_SERVICE);
}

export function getTeamBillingDataRepository(): ITeamBillingDataRepository {
  return billingContainer.get<ITeamBillingDataRepository>(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY);
}

export function getSeatBillingStrategyFactory(): SeatBillingStrategyFactory {
  return billingContainer.get<SeatBillingStrategyFactory>(DI_TOKENS.SEAT_BILLING_STRATEGY_FACTORY);
}

export function getDunningServiceFactory(): DunningServiceFactory {
  return billingContainer.get<DunningServiceFactory>(DI_TOKENS.DUNNING_SERVICE_FACTORY);
}

export function getDunningStatusResolver(): DunningStatusResolver {
  return billingContainer.get<DunningStatusResolver>(DI_TOKENS.DUNNING_STATUS_RESOLVER);
}
