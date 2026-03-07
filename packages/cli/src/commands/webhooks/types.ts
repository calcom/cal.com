import type {
  UserWebhookOutputDto,
  UserWebhookOutputResponseDto,
  UserWebhooksOutputResponseDto,
} from "../../generated/types.gen";

export type Webhook = UserWebhookOutputDto;
export type WebhookResponse = UserWebhookOutputResponseDto["data"];
export type WebhooksResponse = UserWebhooksOutputResponseDto["data"];
