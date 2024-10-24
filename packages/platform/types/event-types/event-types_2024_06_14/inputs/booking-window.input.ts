import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

import type { Disabled_2024_06_14 } from "./disabled.input";

export type BookingWindowPeriodInputType_2024_06_14 = "businessDays" | "calendarDays" | "range";
export type BookingWindowPeriodOutputType_2024_06_14 = "RANGE" | "ROLLING_WINDOW" | "ROLLING" | "UNLIMITED";

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
  @ApiProperty({
    enum: ["businessDays", "calendarDays", "range"],
    description: "Whether the window should be business days, calendar days or a range of dates",
  })
  type!: BookingWindowPeriodInputType_2024_06_14;
}

// Separate classes for different value types
export class BusinessDaysWindow_2024_06_14 extends BookingWindowBase {
  @IsNumber()
  @IsDefined()
  @ApiProperty({ example: 5, description: "How many business day into the future can this event be booked" })
  value!: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    description:
      "If true, the window will be rolling aka from the moment that someone is trying to book this event. Otherwise it will be specified amount of days from the current date.",
  })
  rolling?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}

export class CalendarDaysWindow_2024_06_14 extends BookingWindowBase {
  @IsNumber()
  @IsDefined()
  @ApiProperty({ example: 5, description: "How many calendar days into the future can this event be booked" })
  value!: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    description:
      "If true, the window will be rolling aka from the moment that someone is trying to book this event. Otherwise it will be specified amount of days from the current date.",
  })
  rolling?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}

export class RangeWindow_2024_06_14 extends BookingWindowBase {
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString({}, { each: true })
  @IsDefined()
  @ApiProperty({
    type: [String],
    example: ["2030-09-05", "2030-09-09"],
    description: "Date range for when this event can be booked.",
  })
  value!: string[];

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}

export type BookingWindow_2024_06_14 =
  | BusinessDaysWindow_2024_06_14
  | CalendarDaysWindow_2024_06_14
  | RangeWindow_2024_06_14
  | Disabled_2024_06_14;

// Custom validator to handle the union type
@ValidatorConstraint({ name: "bookingWindowValidator", async: false })
class BookingWindowValidator implements ValidatorConstraintInterface {
  validate(value: BookingWindow_2024_06_14) {
    if ("disabled" in value && value.disabled === true) {
      return true;
    }

    if ("type" in value) {
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
    return false;
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
