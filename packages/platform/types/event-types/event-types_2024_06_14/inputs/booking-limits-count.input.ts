import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export type BookingLimitsKeyOutputType_2024_06_14 = "PER_DAY" | "PER_WEEK" | "PER_MONTH" | "PER_YEAR";
export type BookingLimitsKeysInputType = "day" | "week" | "month" | "year";
export type TransformBookingLimitsSchema_2024_06_14 = {
  [K in BookingLimitsKeyOutputType_2024_06_14]?: number;
};

export class BookingLimitsCount_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: "The number of bookings per day",
    example: 1,
  })
  day?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: "The number of bookings per week",
    example: 2,
  })
  week?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: "The number of bookings per month",
    example: 3,
  })
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: "The number of bookings per year",
    example: 4,
  })
  year?: number;
}
