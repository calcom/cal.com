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

export class ScheduleAvailabilityInput {
  @IsArray()
  @IsIn(WEEK_DAYS, { each: true })
  @ApiProperty()
  days!: WeekDay[];

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  @ApiProperty()
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  @ApiProperty()
  endTime!: string;
}

export class ScheduleOverrideInput {
  @IsISO8601({ strict: true })
  @ApiProperty()
  date!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  @ApiProperty()
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  @ApiProperty()
  endTime!: string;
}

export class CreateScheduleInput {
  @IsString()
  @ApiProperty()
  name!: string;

  @IsTimeZone()
  @ApiProperty()
  timeZone!: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput)
  @ApiProperty()
  availability?: ScheduleAvailabilityInput[];

  @IsBoolean()
  @ApiProperty()
  isDefault!: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput)
  @ApiProperty()
  overrides?: ScheduleOverrideInput[];
}
