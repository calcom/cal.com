import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselySelectedSlotRepository } from "@calcom/lib/server/repository/KyselySelectedSlotRepository";

import { moduleLoader as kyselyModuleLoader } from "./Kysely";

const token = DI_TOKENS.SELECTED_SLOT_REPOSITORY;
const moduleToken = DI_TOKENS.SELECTED_SLOT_REPOSITORY_MODULE;

// SelectedSlot repository module - uses Kysely for all database operations
export const selectedSlotsRepositoryModule = createModule();

selectedSlotsRepositoryModule
  .bind(token)
  .toClass(KyselySelectedSlotRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const selectedSlotsRepositoryModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load selected slots repository module
    container.load(moduleToken, selectedSlotsRepositoryModule);
  },
};
