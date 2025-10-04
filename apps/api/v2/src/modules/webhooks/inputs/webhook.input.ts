import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

import { WebhookTriggerEvents } from "@calcom/platform-libraries";

export class CreateWebhookInputDto {
  @IsString()
  @IsOptional()
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
  payloadTemplate?: string;

  @IsBoolean()
  @ApiProperty()
  active!: boolean;

  @IsString()
  @ApiProperty()
  subscriberUrl!: string;

  @IsArray()
  @ApiProperty({
    example: [
      "BOOKING_CREATED",
      "BOOKING_RESCHEDULED",
      "BOOKING_CANCELLED",
      "BOOKING_CONFIRMED",
      "BOOKING_REJECTED",
      "BOOKING_COMPLETED",
      "BOOKING_NO_SHOW",
      "BOOKING_REOPENED",
    ],
    enum: WebhookTriggerEvents,
  })
  @IsEnum(WebhookTriggerEvents, { each: true })
  triggers!: WebhookTriggerEvents[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  secret?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(2)
  @ApiPropertyOptional({
    description: "The version of the webhook (1 or 2)",
    example: 1,
    minimum: 1,
    maximum: 2,
  })
  version?: number;
}

export class UpdateWebhookInputDto extends PartialType(CreateWebhookInputDto) {}
