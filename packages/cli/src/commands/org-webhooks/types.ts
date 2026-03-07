import type {
  TeamWebhookOutputDto,
  TeamWebhookOutputResponseDto,
  TeamWebhooksOutputResponseDto,
} from "../../generated/types.gen";

export type OrgWebhook = TeamWebhookOutputDto;
export type OrgWebhookResponse = TeamWebhookOutputResponseDto["data"];
export type OrgWebhooksResponse = TeamWebhooksOutputResponseDto["data"];
