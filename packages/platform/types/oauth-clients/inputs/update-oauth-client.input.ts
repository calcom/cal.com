import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

import {
  ARE_CALENDAR_EVENTS_ENABLED_DOCS,
  ARE_DEFAULT_EVENT_TYPES_ENABLED_DOCS,
} from "./create-oauth-client.input";

export class UpdateOAuthClientInput {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  redirectUris?: string[];

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
  @ApiPropertyOptional({
    type: Boolean,
    description: ARE_DEFAULT_EVENT_TYPES_ENABLED_DOCS,
  })
  areDefaultEventTypesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    description: ARE_CALENDAR_EVENTS_ENABLED_DOCS,
  })
  areCalendarEventsEnabled?: boolean;
}
