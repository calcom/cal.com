import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Matches,
  IsISO8601,
  IsTimeZone,
  IsIn,
} from "class-validator";

import type { WeekDay } from "../constants";
import { TIME_FORMAT_HH_MM, WEEK_DAYS } from "../constants";

export class ScheduleAvailabilityInput_2024_06_11 {
  @IsArray()
  @IsIn(WEEK_DAYS, { each: true })
  @ApiProperty({
    type: [String],
    example: ["Monday", "Tuesday"],
    description: "Array of days when schedule is active.",
    enum: WEEK_DAYS,
  })
  days!: WeekDay[];

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  @ApiProperty({
    example: "08:00",
    description: "startTime must be a valid time in format HH:MM e.g. 08:00",
  })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  @ApiProperty({
    example: "15:00",
    description: "endTime must be a valid time in format HH:MM e.g. 15:00",
  })
  endTime!: string;
}

export class ScheduleOverrideInput_2024_06_11 {
  @IsISO8601({ strict: true })
  @ApiProperty({
    example: "2024-05-20",
  })
  date!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  @ApiProperty({
    example: "12:00",
    description: "startTime must be a valid time in format HH:MM e.g. 12:00",
  })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  @ApiProperty({
    example: "13:00",
    description: "endTime must be a valid time in format HH:MM e.g. 13:00",
  })
  endTime!: string;
}

export class CreateScheduleInput_2024_06_11 {
  @IsString()
  @ApiProperty({
    type: String,
    example: "Catch up hours",
  })
  name!: string;

  @IsTimeZone()
  @ApiProperty({
    type: String,
    example: "Europe/Rome",
    description: "Timezone is used to calculate available times when an event using the schedule is booked.",
  })
  timeZone!: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAvailabilityInput_2024_06_11)
  @ApiPropertyOptional({
    type: [ScheduleAvailabilityInput_2024_06_11],
    description:
      "Each object contains days and times when the user is available. If not passed, the default availability is Monday to Friday from 09:00 to 17:00.",
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
  availability?: ScheduleAvailabilityInput_2024_06_11[];

  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    example: true,
    description: `Each user should have 1 default schedule. If you specified \`timeZone\` when creating managed user, then the default schedule will be created with that timezone.
    Default schedule means that if an event type is not tied to a specific schedule then the default schedule is used.`,
  })
  isDefault!: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOverrideInput_2024_06_11)
  @ApiPropertyOptional({
    type: [ScheduleOverrideInput_2024_06_11],
    description: "Need to change availability for a specific date? Add an override.",
    example: [
      {
        date: "2024-05-20",
        startTime: "18:00",
        endTime: "21:00",
      },
    ],
  })
  overrides?: ScheduleOverrideInput_2024_06_11[];
}
