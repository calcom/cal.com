import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { WebhookEventService } from "@calcom/features/ee/billing/service/webhookEvent/WebhookEventService";
import { DI_TOKENS } from "../tokens";
import { prismaWebhookEventRepositoryModuleLoader } from "./WebhookEventRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.WEBHOOK_EVENT_SERVICE;
const moduleToken = DI_TOKENS.WEBHOOK_EVENT_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WebhookEventService,
  depsMap: {
    webhookEventRepository: prismaWebhookEventRepositoryModuleLoader,
  },
});

export const webhookEventServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { WebhookEventService };
