import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyEventTypeRepository } from "@calcom/features/eventtypes/repositories/KyselyEventTypeRepository";

import { type Container, createModule, type ModuleLoader } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const eventTypeRepositoryModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_REPOSITORY;
const moduleToken = DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
eventTypeRepositoryModule
  .bind(token)
  .toClass(KyselyEventTypeRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load event type repository module
    container.load(moduleToken, eventTypeRepositoryModule);
  },
} satisfies ModuleLoader;
