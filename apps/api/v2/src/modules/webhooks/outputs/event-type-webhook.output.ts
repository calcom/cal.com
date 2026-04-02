import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsInt, ValidateNested } from "class-validator";
import { WebhookOutputDto } from "./webhook.output";

export class EventTypeWebhookOutputDto extends WebhookOutputDto {
  @IsInt()
  @Expose()
  readonly eventTypeId!: number;
}

export class EventTypeWebhookOutputResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: EventTypeWebhookOutputDto;
}

export class EventTypeWebhooksOutputResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: EventTypeWebhookOutputDto[];
}
