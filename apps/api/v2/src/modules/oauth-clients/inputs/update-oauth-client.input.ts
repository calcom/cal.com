import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from "class-validator";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

export class UpdateOAuthClientInput {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  redirectUris?: string[] = [];

  @IsOptional()
  @IsString()
  bookingRedirectUri?: string;

  @IsOptional()
  @IsString()
  bookingCancelRedirectUri?: string;

  @IsOptional()
  @IsString()
  bookingRescheduleRedirectUri?: string;

  @IsOptional()
  @IsBoolean()
  areEmailsEnabled?: boolean;

  @IsEnum(WebhookTriggerEvents)
  @ApiProperty({
    description: "List of events that will trigger the webhook",
    example: [WebhookTriggerEvents["BOOKING_CREATED"], WebhookTriggerEvents["BOOKING_CANCELLED"]],
    enum: WebhookTriggerEvents,
  })
  eventTriggers?: WebhookTriggerEvents;

  @IsUrl()
  @IsOptional()
  @ApiProperty({
    description: "Url to send the webhook to",
    example: "https://example.com",
    enum: WebhookTriggerEvents,
  })
  subscriberUrl?: string;
}
