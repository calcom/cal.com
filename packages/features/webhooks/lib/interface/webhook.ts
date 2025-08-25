import type { WebhookEventDTO } from "../dto/types";

export interface IWebhookNotifier {
  emitWebhook(dto: WebhookEventDTO, isDryRun?: boolean): Promise<void>;
}
