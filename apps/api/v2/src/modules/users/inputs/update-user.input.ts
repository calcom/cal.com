import {
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import { TIMEZONES } from "@calcom/platform-constants";

@ValidatorConstraint({ name: "isTimeFormat", async: false })
export class IsTimeFormatConstraint implements ValidatorConstraintInterface {
  validate(timeFormat: number) {
    return timeFormat === 12 || timeFormat === 24;
  }

  defaultMessage() {
    return "timeFormat must be a number either 12 or 24";
  }
}

@ValidatorConstraint({ name: "isWeekStart", async: false })
export class IsWeekStartFormatConstraint implements ValidatorConstraintInterface {
  validate(weekStart: string) {
    if (!weekStart) return true;

    const lowerCaseWeekStart = weekStart.toLowerCase();
    return (
      lowerCaseWeekStart === "monday" ||
      lowerCaseWeekStart === "tuesday" ||
      lowerCaseWeekStart === "wednesday" ||
      lowerCaseWeekStart === "thursday" ||
      lowerCaseWeekStart === "friday" ||
      lowerCaseWeekStart === "saturday" ||
      lowerCaseWeekStart === "sunday"
    );
  }

  defaultMessage() {
    return "weekStart must be a string either Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday";
  }
}

@ValidatorConstraint({ name: "isTimeZone", async: false })
export class IsTimeZoneFormatConstraint implements ValidatorConstraintInterface {
  validate(timeZone: string) {
    if (!timeZone) return true;

    return (TIMEZONES as ReadonlyArray<string>).includes(timeZone);
  }

  defaultMessage() {
    return `timeZone must be a string from the list of timezones: ${TIMEZONES.join(", ")}`;
  }
}

export class UpdateUserInput {
  @IsString()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  @Validate(IsTimeFormatConstraint)
  timeFormat?: number;

  @IsNumber()
  @IsOptional()
  defaultScheduleId?: number;

  @IsString()
  @IsOptional()
  @Validate(IsWeekStartFormatConstraint)
  weekStart?: string;

  @IsString()
  @IsOptional()
  @Validate(IsTimeZoneFormatConstraint)
  timeZone?: string;
}
