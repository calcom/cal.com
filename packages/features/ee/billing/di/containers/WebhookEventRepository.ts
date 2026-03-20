import { createContainer } from "@calcom/features/di/di";
import type { PrismaWebhookEventRepository } from "@calcom/features/ee/billing/repository/webhookEvent/PrismaWebhookEventRepository";

import { prismaWebhookEventRepositoryModuleLoader } from "../modules/WebhookEventRepository.module";
import { DI_TOKENS } from "../tokens";

const container = createContainer();

export function getPrismaWebhookEventRepository(): PrismaWebhookEventRepository {
  prismaWebhookEventRepositoryModuleLoader.loadModule(container);
  return container.get<PrismaWebhookEventRepository>(DI_TOKENS.WEBHOOK_EVENT_REPOSITORY);
}
