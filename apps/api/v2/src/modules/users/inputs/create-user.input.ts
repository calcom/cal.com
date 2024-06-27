import { Transform } from "class-transformer";
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
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    return value && value.toLowerCase();
  })
  // Validate that the username is available within the system or org
  username?: string;

  @IsOptional()
  @IsString()
  @Validate(WeekdayValidator)
  weekday?: string;

  @IsOptional()
  @IsHexColor()
  brandColor?: string;

  @IsOptional()
  @IsHexColor()
  darkBrandColor?: string;

  @IsOptional()
  @IsBoolean()
  hideBranding?: boolean;

  @IsOptional()
  @IsString()
  @Validate(TimeZoneValidator)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @Validate(ThemeValidator)
  theme?: string | null;

  @IsOptional()
  @IsString()
  @Validate(ThemeValidator)
  appTheme?: string | null;

  @IsOptional()
  @IsNumber()
  @Validate(TimeFormatValidator)
  timeFormat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultScheduleId?: number;

  @IsOptional()
  @IsString()
  @Validate(LocaleValidator)
  locale?: string | null = "en";

  @IsOptional()
  @IsString()
  @Validate(AvatarValidator)
  avatar?: string;
}
