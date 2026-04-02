import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, IsTimeZone, ValidateNested } from "class-validator";
import {
  ScheduleAvailabilityInput_2024_06_11,
  ScheduleOverrideInput_2024_06_11,
} from "./create-schedule.input";

export class UpdateScheduleInput_2024_06_11 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: "One-on-one coaching" })
  name?: string;

  @IsTimeZone()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: "Europe/Rome" })
  timeZone?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput_2024_06_11)
  @ApiPropertyOptional({
    type: [ScheduleAvailabilityInput_2024_06_11],
    example: [
      {
        days: ["Monday", "Tuesday"],
        startTime: "09:00",
        endTime: "10:00",
      },
    ],
  })
  availability?: ScheduleAvailabilityInput_2024_06_11[];

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, example: true })
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput_2024_06_11)
  @ApiPropertyOptional({
    type: [ScheduleOverrideInput_2024_06_11],
    example: [
      {
        date: "2024-05-20",
        startTime: "12:00",
        endTime: "14:00",
      },
    ],
  })
  overrides?: ScheduleOverrideInput_2024_06_11[];
}
