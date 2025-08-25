import type { WebhookEventDTO } from "../dto/types";
import type { IWebhookNotifier } from "../interface";
import { WebhookNotifier } from "../service/WebhookNotifier";

/**
 * Adapter to make the static WebhookNotifier compatible with DI interfaces
 * Bridges the gap between static framework class and injectable interface
 */
export class WebhookNotifierAdapter implements IWebhookNotifier {
  async emitWebhook(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    return WebhookNotifier.emitWebhook(dto, isDryRun);
  }
}
