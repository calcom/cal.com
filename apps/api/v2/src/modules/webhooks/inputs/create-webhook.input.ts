import { ApiProperty } from "@nestjs/swagger";
import { WebhookTriggerEvents } from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateWebhookInputDto {
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
  eventTriggers!: WebhookTriggerEvents[];

  @IsString()
  @IsOptional()
  secret?: string;
}
