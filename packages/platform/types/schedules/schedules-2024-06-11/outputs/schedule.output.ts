import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsString, ValidateNested, IsArray, IsTimeZone, IsNumber } from "class-validator";

import {
  ScheduleAvailabilityInput_2024_06_11,
  ScheduleOverrideInput_2024_06_11,
} from "../inputs/create-schedule.input";

export class ScheduleOutput_2024_06_11 {
  @IsNumber()
  @ApiProperty({ example: 254 })
  id!: number;

  @IsNumber()
  @ApiProperty({ example: 478 })
  ownerId!: number;

  @IsString()
  @ApiProperty({ example: "Catch up hours" })
  name!: string;

  @IsTimeZone()
  @ApiProperty({ example: "Europe/Rome" })
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput_2024_06_11)
  @ApiProperty({
    type: [ScheduleAvailabilityInput_2024_06_11],
    example: [
      {
        days: ["Monday", "Tuesday"],
        startTime: "17:00",
        endTime: "19:00",
      },
      {
        days: ["Wednesday", "Thursday"],
        startTime: "16:00",
        endTime: "20:00",
      },
    ],
  })
  availability!: ScheduleAvailabilityInput_2024_06_11[];

  @IsBoolean()
  @ApiProperty({ example: true })
  isDefault!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput_2024_06_11)
  @ApiProperty({
    type: [ScheduleOverrideInput_2024_06_11],
    example: [
      {
        date: "2024-05-20",
        startTime: "18:00",
        endTime: "21:00",
      },
    ],
  })
  overrides!: ScheduleOverrideInput_2024_06_11[];
}
