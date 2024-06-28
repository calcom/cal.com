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
} from "class-validator";

import { AvatarValidator } from "../validators/avatarValidator";
import { LocaleValidator } from "../validators/localeValidator";
import { ThemeValidator } from "../validators/themeValidator";
import { TimeFormatValidator } from "../validators/timeFormatValidator";
import { TimeZoneValidator } from "../validators/timeZoneValidator";
import { WeekdayValidator } from "../validators/weekdayValidator";

export class CreateUserInput {
  @IsEmail()
  @Transform(({ value }) => {
    return value && value.toLowerCase();
  })
  @Expose()
  email!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    return value && value.toLowerCase();
  })
  @Expose()
  // Validate that the username is available within the system or org
  username?: string;

  @IsOptional()
  @IsString()
  @Validate(WeekdayValidator)
  @Expose()
  weekday?: string;

  @IsOptional()
  @IsHexColor()
  @Expose()
  brandColor?: string;

  @IsOptional()
  @IsHexColor()
  @Expose()
  darkBrandColor?: string;

  @IsOptional()
  @IsBoolean()
  @Expose()
  hideBranding?: boolean;

  @IsOptional()
  @IsString()
  @Validate(TimeZoneValidator)
  @Expose()
  timeZone?: string;

  @IsOptional()
  @IsString()
  @Validate(ThemeValidator)
  @Expose()
  theme?: string | null;

  @IsOptional()
  @IsString()
  @Validate(ThemeValidator)
  @Expose()
  appTheme?: string | null;

  @IsOptional()
  @IsNumber()
  @Validate(TimeFormatValidator)
  @Expose()
  timeFormat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Expose()
  defaultScheduleId?: number;

  @IsOptional()
  @IsString()
  @Validate(LocaleValidator)
  @Expose()
  locale?: string | null = "en";

  @IsOptional()
  @IsString()
  @Validate(AvatarValidator)
  @Expose()
  avatarUrl?: string;
}
