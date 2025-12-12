import { KyselyBookingRepository } from "@calcom/features/bookings/repositories/KyselyBookingRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const bookingRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
bookingRepositoryModule
  .bind(token)
  .toClass(KyselyBookingRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load booking repository module
    container.load(moduleToken, bookingRepositoryModule);
  },
};
