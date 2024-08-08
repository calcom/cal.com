import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsInt, IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { WebhookOutputDto } from "./webhook.output";

export class OAuthClientWebhookOutputDto extends WebhookOutputDto {
  @IsInt()
  @Expose()
  readonly oAuthClientId!: string;
}

export class OAuthClientWebhookOutputResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: OAuthClientWebhookOutputDto;
}

export class OAuthClientWebhooksOutputResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: OAuthClientWebhookOutputDto[];
}
