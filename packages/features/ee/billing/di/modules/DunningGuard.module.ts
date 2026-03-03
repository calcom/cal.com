import {
  type Container,
  createModule,
  type ModuleLoader,
  type ResolveFunction,
} from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as teamRepositoryModuleLoader } from "@calcom/features/oauth/di/TeamRepository.module";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { FLAGS_DI_TOKENS } from "@calcom/features/flags/di/tokens";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import { ENTERPRISE_SLUGS } from "../../constants";
import { DunningGuard } from "../../service/dunning/DunningGuard";
import type { DunningServiceFactory } from "../../service/dunning/DunningServiceFactory";
import type { SeatBillingStrategyFactory } from "../../service/seatBillingStrategy/SeatBillingStrategyFactory";
import { DI_TOKENS } from "../tokens";
import { dunningServiceFactoryModuleLoader } from "./DunningServiceFactory.module";
import { seatBillingStrategyFactoryModuleLoader } from "./SeatBillingStrategyFactory.module";

const dunningGuardModule = createModule();
const token = DI_TOKENS.DUNNING_GUARD;

dunningGuardModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const dunningServiceFactory = resolve(DI_TOKENS.DUNNING_SERVICE_FACTORY) as DunningServiceFactory;
  const featuresRepository = resolve(FLAGS_DI_TOKENS.FEATURES_REPOSITORY) as IFeaturesRepository;
  const seatBillingStrategyFactory = resolve(
    DI_TOKENS.SEAT_BILLING_STRATEGY_FACTORY
  ) as SeatBillingStrategyFactory;
  const teamRepository = resolve(GLOBAL_DI_TOKENS.TEAM_REPOSITORY) as TeamRepository;

  return new DunningGuard({
    dunningServiceFactory,
    featuresRepository,
    enterpriseSlugs: ENTERPRISE_SLUGS,
    seatBillingStrategyFactory,
    teamRepository,
  });
});

export const dunningGuardModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    dunningServiceFactoryModuleLoader.loadModule(container);
    featuresRepositoryModuleLoader.loadModule(container);
    seatBillingStrategyFactoryModuleLoader.loadModule(container);
    teamRepositoryModuleLoader.loadModule(container);

    container.load(DI_TOKENS.DUNNING_GUARD_MODULE, dunningGuardModule);
  },
};

export type { DunningGuard };
