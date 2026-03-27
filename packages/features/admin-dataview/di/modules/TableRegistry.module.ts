import { createModule, type Container, type ModuleLoader } from "@calcom/features/di/di";

import { registry } from "../../registry";
import { ADMIN_DATAVIEW_DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = ADMIN_DATAVIEW_DI_TOKENS.TABLE_REGISTRY;
const moduleToken = ADMIN_DATAVIEW_DI_TOKENS.TABLE_REGISTRY_MODULE;

thisModule.bind(token).toFactory(() => registry, "singleton");

export const tableRegistryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, thisModule);
  },
};
