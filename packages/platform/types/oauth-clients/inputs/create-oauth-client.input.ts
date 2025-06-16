import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsBoolean, IsString } from "class-validator";

import { PERMISSION_MAP } from "@calcom/platform-constants";

export const ARE_DEFAULT_EVENT_TYPES_ENABLED_DOCS =
  "If true, when creating a managed user the managed user will have 4 default event types: 30 and 60 minutes without Cal video, 30 and 60 minutes with Cal video. Set this as false if you want to create a managed user and then manually create event types for the user.";

export const ARE_CALENDAR_EVENTS_ENABLED_DOCS =
  "If true and if managed user has calendar connected, calendar events will be created. Disable it if you manually create calendar events. Default to true.";

export class CreateOAuthClientInput {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  logo?: string;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  redirectUris!: string[];

  @IsArray()
  @IsEnum([...Object.keys(PERMISSION_MAP), "*"], { each: true })
  @ApiProperty({
    type: [String],
    description:
      'Array of permission keys like ["BOOKING_READ", "BOOKING_WRITE"]. Use ["*"] to grant all permissions.',
    enum: [...Object.keys(PERMISSION_MAP), "*"],
  })
  permissions!: Array<keyof typeof PERMISSION_MAP | "*">;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bookingRedirectUri?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bookingCancelRedirectUri?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bookingRescheduleRedirectUri?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  areEmailsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value ?? false)
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: ARE_DEFAULT_EVENT_TYPES_ENABLED_DOCS,
  })
  areDefaultEventTypesEnabled? = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value ?? true)
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: ARE_CALENDAR_EVENTS_ENABLED_DOCS,
  })
  areCalendarEventsEnabled? = true;
}
