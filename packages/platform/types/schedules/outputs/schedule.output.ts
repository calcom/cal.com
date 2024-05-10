import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsTimeZone,
  IsNumber,
} from "class-validator";

import { ScheduleAvailability, ScheduleOverride } from "../inputs/create-schedule.input";

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
