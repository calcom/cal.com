import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaWebhookEventRepository } from "@calcom/features/ee/billing/repository/webhookEvent/PrismaWebhookEventRepository";

import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.WEBHOOK_EVENT_REPOSITORY;
const moduleToken = DI_TOKENS.WEBHOOK_EVENT_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaWebhookEventRepository,
  dep: prismaModuleLoader,
});

export const prismaWebhookEventRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaWebhookEventRepository };
