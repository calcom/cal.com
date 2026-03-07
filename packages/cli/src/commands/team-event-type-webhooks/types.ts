import type {
  EventTypeWebhookOutputDto,
  EventTypeWebhookOutputResponseDto,
  EventTypeWebhooksOutputResponseDto,
} from "../../generated/types.gen";

export type TeamEventTypeWebhook = EventTypeWebhookOutputDto;
export type TeamEventTypeWebhookResponse = EventTypeWebhookOutputResponseDto["data"];
export type TeamEventTypeWebhooksResponse = EventTypeWebhooksOutputResponseDto["data"];
