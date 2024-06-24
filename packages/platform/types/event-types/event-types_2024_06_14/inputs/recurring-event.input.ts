import { IsInt, IsEnum, IsOptional, IsString, IsDateString } from "class-validator";

export enum Frequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
  HOURLY = 4,
  MINUTELY = 5,
  SECONDLY = 6,
}

export class RecurringEvent_2024_06_14 {
  @IsOptional()
  @IsDateString()
  dtstart?: Date;

  @IsInt()
  interval!: number;

  @IsInt()
  count!: number;

  @IsEnum(Frequency)
  freq!: Frequency;

  @IsOptional()
  @IsDateString()
  until?: Date;

  @IsOptional()
  @IsString()
  tzid?: string;
}
