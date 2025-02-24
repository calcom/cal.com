import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsBoolean, IsString } from "class-validator";

import { PERMISSION_MAP } from "@calcom/platform-constants";

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
}
