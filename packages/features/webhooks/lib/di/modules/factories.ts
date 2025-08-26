import { createModule } from "@evyweb/ioctopus";

import { WebhookPayloadFactory } from "../../factory/WebhookPayloadFactory";
import type { IWebhookService } from "../../interface/services";
import type { IWebhookNotificationHandler } from "../../interface/webhook";
import { WebhookNotificationHandler } from "../../service/WebhookNotificationHandler";
import { WebhookNotifier } from "../../service/WebhookNotifier";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookFactoryModule = createModule();

webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.WEBHOOK_PAYLOAD_FACTORY).toClass(WebhookPayloadFactory);

webhookFactoryModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFICATION_HANDLER)
  .toFactory(({ resolve }: { resolve: <T>(token: symbol) => T }) => {
    const webhookService = resolve<IWebhookService>(WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE);
    const payloadFactory = resolve<WebhookPayloadFactory>(WEBHOOK_DI_TOKENS.WEBHOOK_PAYLOAD_FACTORY);

    return new WebhookNotificationHandler(webhookService, payloadFactory);
  });

webhookFactoryModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER)
  .toFactory(({ resolve }: { resolve: <T>(token: symbol) => T }) => {
    const handler = resolve<IWebhookNotificationHandler>(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFICATION_HANDLER);

    WebhookNotifier.setHandler(handler);

    return WebhookNotifier;
  });
