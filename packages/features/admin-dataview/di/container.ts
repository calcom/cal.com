import { createContainer } from "@calcom/features/di/di";

import type { AdminDataViewService } from "../server/service";
import type { AdminTableRegistry } from "../AdminTableRegistry";
import { ADMIN_DATAVIEW_DI_TOKENS } from "./tokens";
import { dataViewServiceModuleLoader } from "./modules/DataViewService.module";
import { tableRegistryModuleLoader } from "./modules/TableRegistry.module";

const container = createContainer();

dataViewServiceModuleLoader.loadModule(container);
tableRegistryModuleLoader.loadModule(container);

export function getAdminDataViewService(): AdminDataViewService {
  return container.get<AdminDataViewService>(ADMIN_DATAVIEW_DI_TOKENS.DATA_VIEW_SERVICE);
}

export function getAdminTableRegistry(): AdminTableRegistry {
  return container.get<AdminTableRegistry>(ADMIN_DATAVIEW_DI_TOKENS.TABLE_REGISTRY);
}
