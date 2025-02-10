import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

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
  @Transform(({ value }) => value ?? false)
  @ApiPropertyOptional({
    type: Boolean,
    description:
      "By default false. If enabled, when creating a managed user the managed user will have 4 default event types: 30 and 60 minutes without Cal video, 30 and 60 minutes with Cal video. Leave this disabled if you want to create a managed user and then manually create event types for the user.",
    default: false,
  })
  areDefaultEventTypesEnabled = false;
}
