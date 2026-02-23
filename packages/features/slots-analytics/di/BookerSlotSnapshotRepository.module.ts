import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { BookerSlotSnapshotRepository } from "@calcom/features/slots-analytics/repository/BookerSlotSnapshotRepository";
import { SLOTS_ANALYTICS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = SLOTS_ANALYTICS_DI_TOKENS.BOOKER_SLOT_SNAPSHOT_REPOSITORY;
const moduleToken = SLOTS_ANALYTICS_DI_TOKENS.BOOKER_SLOT_SNAPSHOT_REPOSITORY_MODULE;

const loadModule: ReturnType<typeof bindModuleToClassOnToken> = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookerSlotSnapshotRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookerSlotSnapshotRepository };
