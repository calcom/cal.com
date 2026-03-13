import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString,IsUrl } from "class-validator";

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
  @IsUrl({ require_tld: false }, { each: true })
  @ApiPropertyOptional({ type: [String] })
  redirectUris?: string[];

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @ApiPropertyOptional()
  bookingRedirectUri?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @ApiPropertyOptional()
  bookingCancelRedirectUri?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
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
