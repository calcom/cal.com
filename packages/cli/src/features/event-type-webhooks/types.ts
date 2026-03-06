import type {
  EventTypeWebhookOutputDto,
  EventTypeWebhookOutputResponseDto,
  EventTypeWebhooksOutputResponseDto,
} from "../../generated/types.gen";

export type EventTypeWebhook = EventTypeWebhookOutputDto;
export type EventTypeWebhookResponse = EventTypeWebhookOutputResponseDto["data"];
export type EventTypeWebhooksResponse = EventTypeWebhooksOutputResponseDto["data"];
