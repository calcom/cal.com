import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyBookingReferenceRepository } from "@calcom/lib/server/repository/KyselyBookingReferenceRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const bookingReferenceRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
bookingReferenceRepositoryModule
  .bind(token)
  .toClass(KyselyBookingReferenceRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load booking reference repository module
    container.load(moduleToken, bookingReferenceRepositoryModule);
  },
};
