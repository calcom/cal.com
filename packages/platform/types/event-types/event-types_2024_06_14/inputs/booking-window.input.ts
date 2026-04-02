import { BookingWindowPeriodInputTypeEnum_2024_06_14 } from "@calcom/platform-enums";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  registerDecorator,
  ValidatorConstraint,
} from "class-validator";
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

const rollingDescription = `
      Determines the behavior of the booking window:
      - If **true**, the window is rolling. This means the number of available days will always be equal the specified 'value' 
        and adjust dynamically as bookings are made. For example, if 'value' is 3 and availability is only on Mondays, 
        a booker attempting to schedule on November 10 will see slots on November 11, 18, and 25. As one of these days 
        becomes fully booked, a new day (e.g., December 2) will open up to ensure 3 available days are always visible.
      - If **false**, the window is fixed. This means the booking window only considers the next 'value' days from the
        moment someone is trying to book. For example, if 'value' is 3, availability is only on Mondays, and the current 
        date is November 10, the booker will only see slots on November 11 because the window is restricted to the next 
        3 calendar days (November 10–12).
    `;

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
    description: rollingDescription,
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
    description: rollingDescription,
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
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "ValidateBookingWindow",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new BookingWindowValidator(),
    });
  };
}
