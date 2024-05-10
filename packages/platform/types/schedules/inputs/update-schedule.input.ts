import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsTimeZone } from "class-validator";

import { ScheduleAvailabilityInput, ScheduleOverrideInput } from "./create-schedule.input";

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
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput)
  @ApiProperty()
  availability?: ScheduleAvailabilityInput[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput)
  @ApiProperty()
  overrides?: ScheduleOverrideInput[];
}
