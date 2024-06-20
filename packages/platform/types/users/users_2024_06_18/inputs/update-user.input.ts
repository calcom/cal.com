import {
  IsEmail,
  IsOptional,
  IsString,
  registerDecorator,
  IsInt,
  ValidatorConstraint,
  IsBoolean,
} from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";

import { checkUsername } from "@calcom/lib/server/checkUsername";

export class UpdateUserInput_2024_06_18 {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  // TODO: add available username validation
  username?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @ValidateWeekStartInput_2024_06_18()
  // TODO: Add week day validation
  weekStart?: string;

  @IsOptional()
  @IsString()
  // TODO: add theme validation
  theme?: string;

  @IsOptional()
  @IsString()
  appTheme?: string;

  @IsOptional()
  @IsInt()
  defaultScheduleId?: number;

  @IsOptional()
  @IsString()
  // TODO: Add locale validation
  locale?: string;

  @IsOptional()
  @IsBoolean()
  hideBranding?: boolean;

  @IsOptional()
  // Add validation
  timeFormat?: boolean;

  @IsOptional()
  @IsString()
  brandColor?: string;

  @IsOptional()
  @IsString()
  darkBrandColor?: string;

  @IsOptional()
  // Add validation
  role?: string;
}

@ValidatorConstraint({ async: true })
class UserNameUpdateValidator_2024_06_18 implements ValidatorConstraintInterface {
  async validate(value: any): Promise<boolean> {
    const username = value.toLowerCase();

    const isUserNameAvailable = await checkUsername(username);

    return isUserNameAvailable.available;
  }

  defaultMessage() {
    return "Username is already taken";
  }
}

function ValidateUsernameInput_2024_06_18(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateUsernameInput",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new WeekStartUpdateValidator_2024_06_18(),
    });
  };
}

@ValidatorConstraint({ async: false })
class WeekStartUpdateValidator_2024_06_18 implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    enum weekdays {
      MONDAY = "Monday",
      TUESDAY = "Tuesday",
      WEDNESDAY = "Wednesday",
      THURSDAY = "Thursday",
      FRIDAY = "Friday",
      SATURDAY = "Saturday",
      SUNDAY = "Sunday",
    }

    if (value in weekdays) return true;

    return false;
  }

  defaultMessage() {
    return "Please submit a valid weekday";
  }
}

function ValidateWeekStartInput_2024_06_18(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateWeekStartInput",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new WeekStartUpdateValidator_2024_06_18(),
    });
  };
}
