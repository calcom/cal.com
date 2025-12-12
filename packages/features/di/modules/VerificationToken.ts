import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyVerificationTokenRepository } from "@calcom/lib/server/repository/KyselyVerificationTokenRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const verificationTokenRepositoryModule = createModule();
const token = DI_TOKENS.VERIFICATION_TOKEN_REPOSITORY;
const moduleToken = DI_TOKENS.VERIFICATION_TOKEN_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
verificationTokenRepositoryModule
  .bind(token)
  .toClass(KyselyVerificationTokenRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load verification token repository module
    container.load(moduleToken, verificationTokenRepositoryModule);
  },
};
