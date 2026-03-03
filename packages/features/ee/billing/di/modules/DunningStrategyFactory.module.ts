import {
  type Container,
  createModule,
  type ModuleLoader,
  type ResolveFunction,
} from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { FLAGS_DI_TOKENS } from "@calcom/features/flags/di/tokens";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { DunningServiceFactory } from "../../service/dunning/DunningServiceFactory";
import { DunningStrategyFactory } from "../../service/dunning/DunningStrategyFactory";
import type { SeatBillingStrategyFactory } from "../../service/seatBillingStrategy/SeatBillingStrategyFactory";
import { DI_TOKENS } from "../tokens";
import { dunningServiceFactoryModuleLoader } from "./DunningServiceFactory.module";
import { seatBillingStrategyFactoryModuleLoader } from "./SeatBillingStrategyFactory.module";
import { teamBillingDataRepositoryModuleLoader } from "./TeamBillingDataRepositoryFactory";

const dunningStrategyFactoryModule = createModule();
const token = DI_TOKENS.DUNNING_STRATEGY_FACTORY;

dunningStrategyFactoryModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const inner = resolve(DI_TOKENS.SEAT_BILLING_STRATEGY_FACTORY) as SeatBillingStrategyFactory;
  const dunningServiceFactory = resolve(DI_TOKENS.DUNNING_SERVICE_FACTORY) as DunningServiceFactory;
  const featuresRepository = resolve(FLAGS_DI_TOKENS.FEATURES_REPOSITORY) as IFeaturesRepository;
  const teamBillingDataRepository = resolve(
    DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY
  ) as ITeamBillingDataRepository;

  return new DunningStrategyFactory({
    inner,
    dunningServiceFactory,
    featuresRepository,
    teamBillingDataRepository,
  });
});

export const dunningStrategyFactoryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    seatBillingStrategyFactoryModuleLoader.loadModule(container);
    dunningServiceFactoryModuleLoader.loadModule(container);
    featuresRepositoryModuleLoader.loadModule(container);
    teamBillingDataRepositoryModuleLoader.loadModule(container);

    container.load(DI_TOKENS.DUNNING_STRATEGY_FACTORY_MODULE, dunningStrategyFactoryModule);
  },
};

export type { DunningStrategyFactory };
