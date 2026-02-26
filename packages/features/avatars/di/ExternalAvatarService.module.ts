import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { ExternalAvatarService } from "../service/ExternalAvatarService";
import { moduleLoader as externalAvatarRepositoryModuleLoader } from "./ExternalAvatarRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.EXTERNAL_AVATAR_SERVICE;
const moduleToken = DI_TOKENS.EXTERNAL_AVATAR_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ExternalAvatarService,
  depsMap: {
    externalAvatarRepository: externalAvatarRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { ExternalAvatarService };
