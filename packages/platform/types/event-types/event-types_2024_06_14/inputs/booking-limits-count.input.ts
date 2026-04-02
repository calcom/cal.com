import { ApiPropertyOptional } from "@nestjs/swagger";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { IsBoolean, IsInt, IsOptional, Min, registerDecorator, ValidatorConstraint } from "class-validator";
import type { Disabled_2024_06_14 } from "./disabled.input";

export type BookingLimitsKeyOutputType_2024_06_14 = "PER_DAY" | "PER_WEEK" | "PER_MONTH" | "PER_YEAR";
export type BookingLimitsKeysInputType = "day" | "week" | "month" | "year";
export type TransformBookingLimitsSchema_2024_06_14 = {
  [K in BookingLimitsKeyOutputType_2024_06_14]?: number;
};

export class BaseBookingLimitsCount_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "The number of bookings per day",
    example: 1,
  })
  day?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "The number of bookings per week",
    example: 2,
  })
  week?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "The number of bookings per month",
    example: 3,
  })
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "The number of bookings per year",
    example: 4,
  })
  year?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  disabled?: boolean = false;
}

export type BookingLimitsCount_2024_06_14 = BaseBookingLimitsCount_2024_06_14 | Disabled_2024_06_14;
// Custom validator to handle the union type
@ValidatorConstraint({ name: "BookingLimitsCountValidator", async: false })
class BookingLimitsCountValidator implements ValidatorConstraintInterface {
  private errorDetails: {
    invalidLimit?: string;
    comparedLimit?: string;
  } = {};

  validate(value: BookingLimitsCount_2024_06_14) {
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
      return `Invalid bookingLimitsCount: The number of bookings for ${invalidLimit} cannot exceed the number of bookings for ${comparedLimit}.`;
    }
    return `Invalid bookingLimitsCount`;
  }
}

export function ValidateBookingLimitsCount(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "ValidateBookingLimitsCount",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new BookingLimitsCountValidator(),
    });
  };
}
