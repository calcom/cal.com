import type { interfaces } from "inversify";
import { ContainerModule } from "inversify";

import { DI_SYMBOLS } from "@calcom/di/types";

import { FeaturesRepository } from "./features.repository";
import type { IFeaturesRepository } from "./features.repository.interface";
import { MockFeaturesRepository } from "./features.repository.mock";

const initializeModule = (bind: interfaces.Bind) => {
  if (process.env.NODE_ENV === "test") {
    bind<IFeaturesRepository>(DI_SYMBOLS.FeaturesRepository).to(MockFeaturesRepository);
  } else {
    bind<IFeaturesRepository>(DI_SYMBOLS.FeaturesRepository).to(FeaturesRepository);
  }
};

export const FeaturesModule = new ContainerModule(initializeModule);
