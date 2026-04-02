import { ApiPropertyOptional } from "@nestjs/swagger";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { IsBoolean, IsInt, IsOptional, Min, registerDecorator, ValidatorConstraint } from "class-validator";
import type { Disabled_2024_06_14 } from "./disabled.input";

export class BaseBookingLimitsDuration_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiPropertyOptional({
    description: "The duration of bookings per day (must be a multiple of 15)",
    example: 60,
  })
  day?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiPropertyOptional({
    description: "The duration of bookings per week (must be a multiple of 15)",
    example: 120,
  })
  week?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiPropertyOptional({
    description: "The duration of bookings per month (must be a multiple of 15)",
    example: 180,
  })
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiPropertyOptional({
    description: "The duration of bookings per year (must be a multiple of 15)",
    example: 240,
  })
  year?: number;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}

export type BookingLimitsDuration_2024_06_14 = BaseBookingLimitsDuration_2024_06_14 | Disabled_2024_06_14;
@ValidatorConstraint({ name: "BookingLimitsDurationValidator", async: false })
class BookingLimitsDurationValidator implements ValidatorConstraintInterface {
  private errorDetails: {
    invalidLimit?: string;
    comparedLimit?: string;
  } = {};
  validate(value: BookingLimitsDuration_2024_06_14) {
    if (!value || typeof value !== "object") return false;
    if ("disabled" in value) {
      return true;
    }

    const { day, week, month, year } = value;

    // Check if 'day' exceeds 'week', 'month', or 'year'
    if (day && ((week && day > week) || (month && day > month) || (year && day > year))) {
      this.errorDetails.invalidLimit = "day";
      this.errorDetails.comparedLimit = week && day > week ? "week" : month && day > month ? "month" : "year";
      return false;
    }

    // Check if 'week' exceeds 'month' or 'year'
    if (week && ((month && week > month) || (year && week > year))) {
      this.errorDetails.invalidLimit = "week";
      this.errorDetails.comparedLimit = month && week > month ? "month" : "year";
      return false;
    }

    // Check if 'month' exceeds 'year'
    if (month && year && month > year) {
      this.errorDetails.invalidLimit = "month";
      this.errorDetails.comparedLimit = "year";
      return false;
    }

    return true;
  }

  defaultMessage() {
    const { invalidLimit, comparedLimit } = this.errorDetails;
    if (invalidLimit && comparedLimit) {
      return `Invalid bookingLimitsDuration: The duration of bookings for ${invalidLimit} cannot exceed the duration of bookings for ${comparedLimit}.`;
    }
    return `Invalid bookingLimitsDuration`;
  }
}

export function ValidateBookingLimistsDuration(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "ValidateBookingLimistsDuration",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new BookingLimitsDurationValidator(),
    });
  };
}
