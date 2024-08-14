import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export type BookingLimitsKeyOutputType_2024_06_14 = "PER_DAY" | "PER_WEEK" | "PER_MONTH" | "PER_YEAR";
export type BookingLimitsKeysInputType = "day" | "week" | "month" | "year";
export type TransformBookingLimitsSchema_2024_06_14 = {
  [K in BookingLimitsKeyOutputType_2024_06_14]?: number;
};

export class BookingLimitsDuration_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiProperty({
    description: "The duration of bookings per day (must be a multiple of 15)",
    example: 60,
  })
  day?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiProperty({
    description: "The duration of bookings per week (must be a multiple of 15)",
    example: 120,
  })
  week?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiProperty({
    description: "The duration of bookings per month (must be a multiple of 15)",
    example: 180,
  })
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @ApiProperty({
    description: "The duration of bookings per year (must be a multiple of 15)",
    example: 240,
  })
  year?: number;
}
