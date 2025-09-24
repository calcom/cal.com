import { createModule } from "@calcom/lib/di/di";
import type { Container } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { IRedisService } from "../../redis/IRedisService.d";
import type { IFeaturesRepository } from "../features.repository.interface";
import { FeaturesService } from "../features.service";

const featuresServiceModule = createModule();

featuresServiceModule.bind(DI_TOKENS.FEATURES_SERVICE).toFactory((container: Container) => {
  const featuresRepository = container.get(DI_TOKENS.FEATURES_REPOSITORY) as IFeaturesRepository;
  const redisService = container.get(DI_TOKENS.REDIS_CLIENT) as IRedisService;

  return new FeaturesService(featuresRepository, redisService);
}, "singleton");

export { featuresServiceModule };
