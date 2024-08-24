import { BadRequestException } from "@nestjs/common";
import type { ValidatorConstraintInterface, ValidationOptions } from "class-validator";
import {
  IsEnum,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  IsDateString,
  IsDefined,
  IsOptional,
  ValidatorConstraint,
  registerDecorator,
  IsBoolean,
} from "class-validator";

import { BookingWindowPeriodInputTypeEnum_2024_06_14 } from "@calcom/platform-enums";

export type BookingWindowPeriodInputType_2024_06_14 = "businessDays" | "calendarDays" | "range";
export type BookingWindowPeriodOutputType_2024_06_14 = "RANGE" | "ROLLING_WINDOW" | "ROLLING";

export type TransformFutureBookingsLimitSchema_2024_06_14 = {
  periodType: BookingWindowPeriodOutputType_2024_06_14;
  periodDays?: number;
  periodCountCalendarDays?: boolean;
  periodStartDate?: Date;
  periodEndDate?: Date;
};

// Base class for common properties and validation
class BookingWindowBase {
  @IsEnum(BookingWindowPeriodInputTypeEnum_2024_06_14)
  type!: BookingWindowPeriodInputType_2024_06_14;
}

// Separate classes for different value types
export class BusinessDaysWindow_2024_06_14 extends BookingWindowBase {
  @IsNumber()
  @IsDefined()
  value!: number;

  @IsOptional()
  @IsBoolean()
  rolling?: boolean;
}

export class CalendarDaysWindow_2024_06_14 extends BookingWindowBase {
  @IsNumber()
  @IsDefined()
  value!: number;

  @IsOptional()
  @IsBoolean()
  rolling?: boolean;
}

export class RangeWindow_2024_06_14 extends BookingWindowBase {
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString({}, { each: true })
  @IsDefined()
  value!: string[];
}

export type BookingWindow_2024_06_14 =
  | BusinessDaysWindow_2024_06_14
  | CalendarDaysWindow_2024_06_14
  | RangeWindow_2024_06_14;

// Custom validator to handle the union type
@ValidatorConstraint({ name: "bookingWindowValidator", async: false })
class BookingWindowValidator implements ValidatorConstraintInterface {
  validate(value: BookingWindow_2024_06_14) {
    if (!value || !value.type) {
      throw new BadRequestException(`'BookingWindow' must have a type`);
    }

    switch (value.type) {
      case BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays:
      case BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays:
        return (
          typeof value.value === "number" &&
          (typeof (value as BusinessDaysWindow_2024_06_14 | CalendarDaysWindow_2024_06_14).rolling ===
            "undefined" ||
            typeof (value as BusinessDaysWindow_2024_06_14 | CalendarDaysWindow_2024_06_14).rolling ===
              "boolean")
        );
      case BookingWindowPeriodInputTypeEnum_2024_06_14.range:
        return (
          Array.isArray(value.value) &&
          value.value.every((date: any) => typeof date === "string" && !isNaN(Date.parse(date)))
        );
      default:
        return false;
    }
  }

  defaultMessage() {
    return "Invalid bookingWindow structure.";
  }
}

export function ValidateBookingWindow(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateBookingWindow",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new BookingWindowValidator(),
    });
  };
}
