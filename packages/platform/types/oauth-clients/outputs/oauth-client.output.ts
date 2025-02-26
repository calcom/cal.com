import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsString, IsNumber, IsOptional, IsDate, IsBoolean, IsUrl } from "class-validator";

import { PERMISSION_MAP } from "@calcom/platform-constants";

export class PlatformOAuthClientDto {
  @ApiProperty({ example: "clsx38nbl0001vkhlwin9fmt0" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "MyClient" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "secretValue" })
  @IsString()
  secret!: string;

  @ApiProperty({ example: ["BOOKING_READ", "BOOKING_WRITE"] })
  @IsArray()
  @IsEnum(PERMISSION_MAP, { each: true })
  @ApiProperty({
    type: [String],
    description: 'Array of permission keys like ["BOOKING_READ", "BOOKING_WRITE"]',
    enum: Object.keys(PERMISSION_MAP),
  })
  permissions!: Array<keyof typeof PERMISSION_MAP>;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  @IsOptional()
  @IsString()
  logo!: string | null;

  @ApiProperty({ example: ["https://example.com/callback"] })
  @IsArray()
  @IsString({ each: true })
  redirectUris!: string[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  organizationId!: number;

  @ApiProperty({ example: "2024-03-23T08:33:21.851Z", type: Date })
  @IsDate()
  createdAt!: Date;

  @ApiPropertyOptional({ example: "https://example.com/booking-redirect" })
  @IsOptional()
  @IsUrl()
  bookingRedirectUri?: string;

  @ApiPropertyOptional({ example: "https://example.com/booking-cancel" })
  @IsOptional()
  @IsUrl()
  bookingCancelRedirectUri?: string;

  @ApiPropertyOptional({ example: "https://example.com/booking-reschedule" })
  @IsOptional()
  @IsUrl()
  bookingRescheduleRedirectUri?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  areEmailsEnabled?: boolean;
}
