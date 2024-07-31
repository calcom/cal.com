import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsBoolean, IsString, IsEnum, IsUrl } from "class-validator";
import { z } from "zod";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

export class CreateOAuthClientInput {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  redirectUris!: string[];

  @IsNumber()
  permissions!: number;

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

export class DeleteOAuthClientInput {
  @IsString()
  id!: string;
}

export const userSchemaResponse = z.object({
  id: z.number().int(),
  email: z.string(),
  timeFormat: z.number().int().default(12),
  defaultScheduleId: z.number().int().nullable(),
  weekStart: z.string(),
  timeZone: z.string().default("Europe/London"),
  username: z.string(),
  organizationId: z.number().nullable(),
});

export type UserResponse = z.infer<typeof userSchemaResponse>;
