import { ApiResponseWithoutData } from "@calcom/platform-types";
import { Expose, Type } from "class-transformer";
import { IsInt, ValidateNested } from "class-validator";
import { WebhookOutputDto } from "./webhook.output";

export class OAuthClientWebhookOutputDto extends WebhookOutputDto {
  @IsInt()
  @Expose()
  readonly oAuthClientId!: string;
}

export class OAuthClientWebhookOutputResponseDto extends ApiResponseWithoutData {
  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: OAuthClientWebhookOutputDto;
}

export class OAuthClientWebhooksOutputResponseDto extends ApiResponseWithoutData {
  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: OAuthClientWebhookOutputDto[];
}
