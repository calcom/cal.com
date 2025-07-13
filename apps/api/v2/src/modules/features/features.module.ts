import { Module } from "@nestjs/common";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { CachedFeaturesRepository } from "@calcom/features/flags/features.repository.cached";

import { FeaturesService } from "./services/features.service";

@Module({
  providers: [FeaturesRepository, CachedFeaturesRepository, FeaturesService],
  exports: [FeaturesService, CachedFeaturesRepository],
})
export class FeaturesModule {}
