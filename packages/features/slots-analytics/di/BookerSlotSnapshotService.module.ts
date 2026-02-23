import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { BookerSlotSnapshotService } from "@calcom/features/slots-analytics/service/BookerSlotSnapshotService";
import { moduleLoader as bookerSlotSnapshotRepositoryModuleLoader } from "./BookerSlotSnapshotRepository.module";
import { SLOTS_ANALYTICS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = SLOTS_ANALYTICS_DI_TOKENS.BOOKER_SLOT_SNAPSHOT_SERVICE;
const moduleToken = SLOTS_ANALYTICS_DI_TOKENS.BOOKER_SLOT_SNAPSHOT_SERVICE_MODULE;

const loadModule: ReturnType<typeof bindModuleToClassOnToken> = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookerSlotSnapshotService,
  depsMap: {
    bookerSlotSnapshotRepo: bookerSlotSnapshotRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookerSlotSnapshotService };
