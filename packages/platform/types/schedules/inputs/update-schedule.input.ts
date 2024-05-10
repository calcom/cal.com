import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsTimeZone } from "class-validator";

import { ScheduleAvailability, ScheduleOverride } from "./create-schedule.input";

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
