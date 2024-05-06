import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsArray,
  IsTimeZone,
  Matches,
  IsISO8601,
  IsEnum,
} from "class-validator";
import { DateTime } from "luxon";
import { z } from "zod";

const scheduleSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  name: z.string(),
  timeZone: z.string().nullish(),
});

const availabilitySchema = z.object({
  id: z.number().int(),
  days: z.number().int().array(),
  startTime: z.date(),
  endTime: z.date(),
});

export const schemaScheduleResponse = z
  .object({})
  .merge(scheduleSchema)
  .merge(
    z.object({
      availability: z
        .array(availabilitySchema)
        .transform((availabilities) =>
          availabilities.map((availability) => ({
            ...availability,
            startTime: DateTime.fromJSDate(availability.startTime).toUTC().toFormat("HH:mm:ss"),
            endTime: DateTime.fromJSDate(availability.endTime).toUTC().toFormat("HH:mm:ss"),
          }))
        )
        .optional(),
    })
  );

export type ScheduleResponse = z.infer<typeof schemaScheduleResponse>;

export enum WeekDay {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday",
}

const TIME_FORMAT_HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

class ScheduleAvailability {
  @IsEnum(WeekDay, { each: true })
  days!: WeekDay[];

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  endTime!: string;
}

export class ScheduleOverride {
  @IsISO8601({ strict: true })
  date!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "startTime must be a valid time format HH:MM" })
  startTime!: string;

  @IsString()
  @Matches(TIME_FORMAT_HH_MM, { message: "endTime must be a valid time format HH:MM" })
  endTime!: string;
}

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
