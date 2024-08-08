import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

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
}
