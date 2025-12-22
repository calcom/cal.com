import { DI_TOKENS } from "@calcom/features/di/tokens";
import { CachedFeaturesRepository } from "@calcom/features/flags/cached-features.repository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { redisModule } from "@calcom/features/redis/di/redisModule";

import { type Container, createModule } from "../di";

export const featuresRepositoryModule = createModule();
const token = DI_TOKENS.FEATURES_REPOSITORY;
const moduleToken = DI_TOKENS.FEATURES_REPOSITORY_MODULE;
const baseFeaturesRepositoryToken = Symbol("BaseFeaturesRepository");

featuresRepositoryModule.bind(baseFeaturesRepositoryToken).toClass(FeaturesRepository, [DI_TOKENS.PRISMA_CLIENT]);

featuresRepositoryModule.bind(token).toFactory(
  (resolve) => {
    const baseFeaturesRepository = resolve(baseFeaturesRepositoryToken);
    const redisService = resolve(DI_TOKENS.REDIS_CLIENT);
    return new CachedFeaturesRepository(baseFeaturesRepository, redisService);
  },
  "singleton"
);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(DI_TOKENS.REDIS_CLIENT, redisModule);
    container.load(moduleToken, featuresRepositoryModule);
  },
};
