import { ApiProperty } from "@nestjs/swagger";
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
  @ApiProperty({ example: "One-on-one coaching" })
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
        startTime: "09:00",
        endTime: "10:00",
      },
    ],
  })
  availability!: ScheduleAvailabilityInput_2024_06_11[];

  @IsBoolean()
  @ApiProperty({ example: true })
  isDefault!: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput_2024_06_11)
  @ApiProperty({
    type: [ScheduleOverrideInput_2024_06_11],
    example: [
      {
        date: "2024-05-20",
        startTime: "12:00",
        endTime: "13:00",
      },
    ],
  })
  overrides!: ScheduleOverrideInput_2024_06_11[];
}
