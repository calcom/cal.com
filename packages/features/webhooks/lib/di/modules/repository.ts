import { createModule } from "@evyweb/ioctopus";

import { WebhookRepository } from "../../repository/WebhookRepository";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookRepositoryModule = createModule();

webhookRepositoryModule.bind(WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY).toClass(WebhookRepository);
