import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import logger from "@calcom/lib/logger";
import type { ResolveFunction } from "@evyweb/ioctopus";

import { AuthSignInService } from "../services/AuthSignInService";
import type { AuthAccountLinkingService } from "../services/AuthAccountLinkingService";
import { moduleLoader as accountLinkingModuleLoader } from "./AuthAccountLinkingService.module";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_SIGN_IN_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_SIGN_IN_SERVICE_MODULE;

thisModule
  .bind(token)
  .toFactory(
    (resolve: ResolveFunction) => {
      const accountLinkingService = resolve(
        accountLinkingModuleLoader.token
      ) as AuthAccountLinkingService;
      const log = logger.getSubLogger({ prefix: ["AuthSignInService"] });

      return new AuthSignInService({
        accountLinkingService,
        log,
      });
    },
    "singleton"
  );

const loadModule = (container: Container) => {
  accountLinkingModuleLoader.loadModule(container);
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AuthSignInService };
