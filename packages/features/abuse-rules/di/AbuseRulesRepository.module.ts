import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { AbuseRulesRepository } from "../repositories/AbuseRulesRepository";
import { ABUSE_RULES_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_RULES_DI_TOKENS.REPOSITORY;
const moduleToken = ABUSE_RULES_DI_TOKENS.REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AbuseRulesRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AbuseRulesRepository };
