import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaAuditEventRepository } from "../repositories/PrismaAuditEventRepository";
import { AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUDIT_DI_TOKENS.AUDIT_EVENT_REPOSITORY;
const moduleToken = AUDIT_DI_TOKENS.AUDIT_EVENT_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaAuditEventRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
