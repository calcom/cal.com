import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsArray,
  IsTimeZone,
  Matches,
  IsISO8601,
  IsEnum,
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

export class ScheduleOverride {
  @IsISO8601({ strict: true })
  date!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  endTime!: string;
}

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  @ApiProperty()
  name?: string;

  @IsTimeZone()
  @IsOptional()
  @ApiProperty()
  timeZone?: string;

  @IsArray()
  @IsOptional()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailability)
  @ApiProperty()
  availability?: ScheduleAvailability[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverride)
  @ApiProperty()
  overrides?: ScheduleOverride[];
}
