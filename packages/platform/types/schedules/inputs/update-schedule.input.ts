import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsTimeZone } from "class-validator";

import { ScheduleAvailabilityInput, ScheduleOverrideInput } from "./create-schedule.input";

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: "One-on-one coaching", required: false })
  name?: string;

  @IsTimeZone()
  @IsOptional()
  @ApiProperty({ example: "Europe/Rome", required: false })
  timeZone?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput)
  @ApiProperty({
    type: [ScheduleAvailabilityInput],
    example: [
      {
        days: ["Monday", "Tuesday"],
        startTime: "09:00",
        endTime: "10:00",
      },
    ],
    required: false,
  })
  availability?: ScheduleAvailabilityInput[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput)
  @ApiProperty({
    type: [ScheduleOverrideInput],
    example: [
      {
        date: "2024-05-20",
        startTime: "12:00",
        endTime: "14:00",
      },
    ],
    required: false,
  })
  overrides?: ScheduleOverrideInput[];
}
