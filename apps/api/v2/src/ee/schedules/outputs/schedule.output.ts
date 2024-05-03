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

export enum WeekDay {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday",
}

const TIME_FORMAT_HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
