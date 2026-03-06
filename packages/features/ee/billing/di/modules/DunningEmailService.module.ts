import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DunningEmailService } from "@calcom/features/ee/billing/service/dunning/DunningEmailService";
import { DI_TOKENS } from "../tokens";
import { dunningServiceFactoryModuleLoader } from "./DunningServiceFactory.module";

const thisModule = createModule();
const token = DI_TOKENS.DUNNING_EMAIL_SERVICE;
const moduleToken = DI_TOKENS.DUNNING_EMAIL_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: DunningEmailService,
  depsMap: {
    dunningServiceFactory: dunningServiceFactoryModuleLoader,
    prismaClient: prismaModuleLoader,
  },
});

export const dunningEmailServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { DunningEmailService };
