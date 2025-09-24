import { createModule } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { FeaturesService } from "../features.service";

const featuresServiceModule = createModule();

featuresServiceModule.bind(DI_TOKENS.FEATURES_SERVICE).toFactory((container) => {
  const featuresRepository = container.get(DI_TOKENS.FEATURES_REPOSITORY);
  const redisService = container.get(DI_TOKENS.REDIS_CLIENT);

  return new FeaturesService(featuresRepository, redisService);
}, "singleton");

export { featuresServiceModule };
