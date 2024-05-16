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

import { ScheduleAvailabilityInput, ScheduleOverrideInput } from "../inputs/create-schedule.input";

export class ScheduleOutput {
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
  })
  availability!: ScheduleAvailabilityInput[];

  @IsBoolean()
  @ApiProperty({ example: true })
  isDefault!: boolean;

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
        endTime: "13:00",
      },
    ],
  })
  overrides!: ScheduleOverrideInput[];
}
