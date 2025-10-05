import { CapitalizeTimeZone } from "@/lib/inputs/capitalize-timezone";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  Min,
  IsObject,
} from "class-validator";

import { ValidateMetadata } from "@calcom/platform-types";

import { AvatarValidator } from "../validators/avatarValidator";
import { LocaleValidator } from "../validators/localeValidator";
import { ThemeValidator } from "../validators/themeValidator";
import { TimeFormatValidator } from "../validators/timeFormatValidator";
import { TimeZoneValidator } from "../validators/timeZoneValidator";
import { WeekdayValidator } from "../validators/weekdayValidator";

export class CreateUserInput {
  @ApiProperty({ type: String, description: "User email address", example: "user@example.com" })
  @IsEmail()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.toLowerCase();
    }
  })
  @Expose()
  email!: string;

  @ApiProperty({ type: String, required: false, description: "Username", example: "user123" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.toLowerCase();
    }
  })
  @Expose()
  username?: string;

  @ApiProperty({ type: String, required: false, description: "Preferred weekday", example: "Monday" })
  @IsOptional()
  @IsString()
  @Validate(WeekdayValidator)
  @Expose()
  weekday?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Brand color in HEX format",
    example: "#FFFFFF",
  })
  @IsOptional()
  @IsHexColor()
  @Expose()
  brandColor?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Bio",
    example: "I am a bio",
  })
  @IsOptional()
  @IsString()
  @Expose()
  bio?: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      "You can store any additional data you want here. Metadata must have at most 50 keys, each key up to 40 characters, and values up to 500 characters.",
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @ValidateMetadata({
    message:
      "Metadata must have at most 50 keys, each key up to 40 characters, and values up to 500 characters.",
  })
  @Expose()
  @Transform(
    // note(Lauris): added this transform because without it metadata is removed for some reason
    ({ obj }: { obj: { metadata: Record<string, unknown> | null | undefined } }) => {
      return obj.metadata || undefined;
    }
  )
  metadata?: Record<string, string | boolean | number>;

  @ApiProperty({
    type: String,
    required: false,
    description: "Dark brand color in HEX format",
    example: "#000000",
  })
  @IsOptional()
  @IsHexColor()
  @Expose()
  darkBrandColor?: string;

  @ApiProperty({ type: Boolean, required: false, description: "Hide branding", example: false })
  @IsOptional()
  @IsBoolean()
  @Expose()
  hideBranding?: boolean;

  @ApiProperty({ type: String, required: false, description: "Time zone", example: "America/New_York" })
  @IsOptional()
  @IsString()
  @CapitalizeTimeZone()
  @Validate(TimeZoneValidator)
  @Expose()
  timeZone?: string;

  @ApiProperty({ type: String, required: false, description: "Theme", example: "dark" })
  @IsOptional()
  @IsString()
  @Validate(ThemeValidator)
  @Expose()
  theme?: string | null;

  @ApiProperty({ type: String, required: false, description: "Application theme", example: "light" })
  @IsOptional()
  @IsString()
  @Validate(ThemeValidator)
  @Expose()
  appTheme?: string | null;

  @ApiProperty({ type: Number, required: false, description: "Time format", example: 24 })
  @IsOptional()
  @IsNumber()
  @Validate(TimeFormatValidator)
  @Expose()
  timeFormat?: number;

  @ApiProperty({ type: Number, required: false, description: "Default schedule ID", example: 1, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Expose()
  defaultScheduleId?: number;

  @ApiProperty({ type: String, required: false, description: "Locale", example: "en", default: "en" })
  @IsOptional()
  @IsString()
  @Validate(LocaleValidator)
  @Expose()
  locale?: string | null = "en";

  @ApiProperty({
    type: String,
    required: false,
    description: "Avatar URL",
    example: "https://example.com/avatar.jpg",
  })
  @IsOptional()
  @IsString()
  @Validate(AvatarValidator)
  @Expose()
  avatarUrl?: string;
}
