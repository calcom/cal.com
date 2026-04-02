import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";

export const credentialRepositoryModule = createModule();
const token = DI_TOKENS.CREDENTIAL_REPOSITORY;
const moduleToken = DI_TOKENS.CREDENTIAL_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: credentialRepositoryModule,
  moduleToken,
  token,
  classs: CredentialRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
