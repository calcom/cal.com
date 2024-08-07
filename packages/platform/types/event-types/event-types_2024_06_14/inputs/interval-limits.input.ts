import { IsInt, IsOptional, Min } from "class-validator";

export type BookingLimitsKeyOutputType_2024_06_14 = "PER_DAY" | "PER_WEEK" | "PER_MONTH" | "PER_YEAR";
export type BookingLimitsKeysInputType = "day" | "week" | "month" | "year";
export type TransformBookingLimitsSchema_2024_06_14 = {
  [K in BookingLimitsKeyOutputType_2024_06_14]?: number;
};

export class IntervalLimits_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  day!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  week!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  month!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  year!: number;
}
