import { ApiProperty } from "@nestjs/swagger";
import { WebhookTriggerEvents } from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateUserWebhookInputDto {
  @IsString()
  @IsOptional()
  payloadTemplate?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsString()
  subscriberUrl!: string;

  @IsArray()
  @ApiProperty({
    example: [
      WebhookTriggerEvents["BOOKING_CREATED"],
      WebhookTriggerEvents["BOOKING_RESCHEDULED"],
      WebhookTriggerEvents["BOOKING_CANCELLED"],
    ],
    enum: WebhookTriggerEvents,
  })
  @IsEnum(WebhookTriggerEvents, { each: true })
  eventTriggers!: WebhookTriggerEvents[];

  @IsString()
  @IsOptional()
  secret?: string;
}
