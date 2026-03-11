import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  ValidateNested,
} from "class-validator";
import { TIME_FORMAT_HH_MM } from "../constants";
import { ScheduleAvailabilityInput_2024_06_11 } from "../inputs/create-schedule.input";

export class ScheduleOverrideOutput_2024_06_11 {
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

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    type: String,
    example: "2024-05-20T00:00:00.000Z",
    description: "The date and time when the override was created.",
    nullable: true,
  })
  createdAt?: string | null;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    type: String,
    example: "2024-05-20T00:00:00.000Z",
    description: "The date and time when the override was last updated.",
    nullable: true,
  })
  updatedAt?: string | null;
}

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
  @Type(() => ScheduleOverrideOutput_2024_06_11)
  @ApiProperty({
    type: [ScheduleOverrideOutput_2024_06_11],
    example: [
      {
        date: "2024-05-20",
        startTime: "18:00",
        endTime: "21:00",
        createdAt: "2024-05-20T00:00:00.000Z",
        updatedAt: "2024-05-20T00:00:00.000Z",
      },
    ],
  })
  overrides!: ScheduleOverrideOutput_2024_06_11[];
}
