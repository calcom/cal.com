import { createModule } from "@evyweb/ioctopus";

import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";

import { WEBHOOK_TOKENS } from "../webhooks.tokens";

export const webhookRepositoryModule = createModule();

webhookRepositoryModule.bind(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY).toClass(WebhookRepository);
