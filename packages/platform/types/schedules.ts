import { Type } from "class-transformer";
import { IsNumber, IsString, IsBoolean, IsOptional, ValidateNested } from "class-validator";
import { DateTime } from "luxon";
import { z } from "zod";

import type { TimeRange } from "@calcom/types/schedule";

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

class ScheduleItem {
  @IsString()
  start!: Date;

  @IsString()
  end!: Date;
}

export class UpdateScheduleInput {
  @IsNumber()
  scheduleId!: number;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ValidateNested({ each: true })
  @Type(() => ScheduleItem)
  schedule!: ScheduleItem[][];

  @IsOptional()
  @ValidateNested({ each: true })
  dateOverrides?: { ranges: TimeRange[] }[];
}
