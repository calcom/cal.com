import { createModule } from "@evyweb/ioctopus";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { DI_TOKENS } from "../tokens";

export const featuresModule = createModule();
featuresModule.bind(DI_TOKENS.FEATURES_REPOSITORY).toFactory(() => new FeaturesRepository(), "singleton");
