import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { AdminDataViewService } from "../../server/service";
import { ADMIN_DATAVIEW_DI_TOKENS } from "../tokens";
import { tableRegistryModuleLoader } from "./TableRegistry.module";

const thisModule = createModule();
const token = ADMIN_DATAVIEW_DI_TOKENS.DATA_VIEW_SERVICE;
const moduleToken = ADMIN_DATAVIEW_DI_TOKENS.DATA_VIEW_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AdminDataViewService,
  depsMap: {
    prisma: { token: prismaModuleLoader.readOnlyToken, loadModule: prismaModuleLoader.loadModule },
    registry: tableRegistryModuleLoader,
  },
});

export const dataViewServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
