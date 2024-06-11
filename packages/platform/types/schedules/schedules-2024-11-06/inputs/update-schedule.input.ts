import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsTimeZone } from "class-validator";

import {
  ScheduleAvailabilityInput_2024_11_06,
  ScheduleOverrideInput_2024_11_06,
} from "./create-schedule.input";

export class UpdateScheduleInput_2024_11_06 {
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
  @Type(() => ScheduleAvailabilityInput_2024_11_06)
  @ApiProperty({
    type: [ScheduleAvailabilityInput_2024_11_06],
    example: [
      {
        days: ["Monday", "Tuesday"],
        startTime: "09:00",
        endTime: "10:00",
      },
    ],
    required: false,
  })
  availability?: ScheduleAvailabilityInput_2024_11_06[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput_2024_11_06)
  @ApiProperty({
    type: [ScheduleOverrideInput_2024_11_06],
    example: [
      {
        date: "2024-05-20",
        startTime: "12:00",
        endTime: "14:00",
      },
    ],
    required: false,
  })
  overrides?: ScheduleOverrideInput_2024_11_06[];
}
