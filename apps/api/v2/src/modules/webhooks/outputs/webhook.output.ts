import { ApiProperty } from "@nestjs/swagger";
import { WebhookTriggerEvents } from "@prisma/client";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class WebhookOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsString()
  @Expose()
  @ApiProperty({
    description:
      "The template of the payload that will be sent to the subscriberUrl, check cal.com/docs/core-features/webhooks for more information",
    example: JSON.stringify({
      content: "A new event has been scheduled",
      type: "{{type}}",
      name: "{{title}}",
      organizer: "{{organizer.name}}",
      booker: "{{attendees.0.name}}",
    }),
  })
  readonly payloadTemplate!: string;

  @IsEnum(WebhookTriggerEvents)
  readonly eventTriggers!: WebhookTriggerEvents[];

  @IsString()
  @Expose()
  readonly subscriberUrl!: string;

  @IsBoolean()
  @Expose()
  readonly active!: boolean;
}

export class DeleteManyWebhooksOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: string;
}
