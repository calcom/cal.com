import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Matches,
  IsISO8601,
  IsTimeZone,
  IsNumber,
} from "class-validator";

import { TIME_FORMAT_HH_MM, WeekDay } from "../constants";

class ScheduleAvailability {
  @IsEnum(WeekDay, { each: true })
  days!: WeekDay[];

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  endTime!: string;
}

class ScheduleOverride {
  @IsISO8601({ strict: true })
  date!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  endTime!: string;
}

export class ScheduleOutput {
  @IsNumber()
  id!: number;

  @IsNumber()
  ownerId!: number;

  @IsString()
  name!: string;

  @IsTimeZone()
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailability)
  availability!: ScheduleAvailability[];

  @IsBoolean()
  isDefault!: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverride)
  overrides!: ScheduleOverride[];
}
