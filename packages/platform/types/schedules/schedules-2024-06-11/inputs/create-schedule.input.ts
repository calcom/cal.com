import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Matches,
  IsISO8601,
  IsTimeZone,
  IsIn,
} from "class-validator";

import type { WeekDay } from "../constants";
import { TIME_FORMAT_HH_MM, WEEK_DAYS } from "../constants";

export class ScheduleAvailabilityInput_2024_06_11 {
  @IsArray()
  @IsIn(WEEK_DAYS, { each: true })
  @ApiProperty({ example: ["Monday", "Tuesday"] })
  days!: WeekDay[];

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  @ApiProperty({ example: "09:00" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  @ApiProperty({ example: "10:00" })
  endTime!: string;
}

export class ScheduleOverrideInput_2024_06_11 {
  @IsISO8601({ strict: true })
  @ApiProperty({ example: "2024-05-20" })
  date!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  @ApiProperty({ example: "12:00" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  @ApiProperty({ example: "13:00" })
  endTime!: string;
}

export class CreateScheduleInput_2024_06_11 {
  @IsString()
  @ApiProperty({ example: "One-on-one coaching" })
  name!: string;

  @IsTimeZone()
  @ApiProperty({ example: "Europe/Rome" })
  timeZone!: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput_2024_06_11)
  @ApiProperty({
    type: [ScheduleAvailabilityInput_2024_06_11],
    example: [
      {
        days: ["Monday", "Tuesday"],
        startTime: "09:00",
        endTime: "10:00",
      },
    ],
    required: false,
  })
  availability?: ScheduleAvailabilityInput_2024_06_11[];

  @IsBoolean()
  @ApiProperty({ example: true })
  isDefault!: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput_2024_06_11)
  @ApiProperty({
    type: [ScheduleOverrideInput_2024_06_11],
    example: [
      {
        date: "2024-05-20",
        startTime: "12:00",
        endTime: "14:00",
      },
    ],
    required: false,
  })
  overrides?: ScheduleOverrideInput_2024_06_11[];
}
