import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaCredentialRepository } from "../repositories/prisma-credential-repository";
import { CALENDAR_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_DI_TOKENS.CALENDAR_V2_CREDENTIAL_REPOSITORY;
const moduleToken = CALENDAR_DI_TOKENS.CALENDAR_V2_CREDENTIAL_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaCredentialRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaCredentialRepository };
