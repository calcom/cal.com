import type { WebhookEventDTO } from "../dto/types";
import type { WebhookPayload } from "../factory/types";

export interface IWebhookPayloadFactory {
  createPayload(dto: WebhookEventDTO): WebhookPayload;
}
