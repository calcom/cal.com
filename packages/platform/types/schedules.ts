import { ApiProperty as DocsProperty, ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsDate } from "class-validator";
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

class ScheduleItem {
  @IsString()
  start!: Date;

  @IsString()
  end!: Date;
}

class DateOverride {
  @IsDate()
  @Type(() => Date)
  start!: Date;

  @IsDate()
  @Type(() => Date)
  end!: Date;
}

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  @DocsProperty()
  timeZone?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  name?: string;

  @IsBoolean()
  @IsOptional()
  @DocsProperty()
  isDefault?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItem)
  @DocsProperty()
  @IsArray()
  @ApiProperty({
    type: [[ScheduleItem]],
    example: [
      [],
      [{ start: "2022-01-01T00:00:00.000Z", end: "2022-01-02T00:00:00.000Z" }],
      [],
      [],
      [],
      [],
      [],
    ],
    isArray: true,
  })
  schedule?: ScheduleItem[][];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DateOverride)
  @IsArray()
  @DocsProperty()
  @ApiProperty({
    type: [DateOverride],
    example: [
      [],
      [{ start: "2022-01-01T00:00:00.000Z", end: "2022-01-02T00:00:00.000Z" }],
      [],
      [],
      [],
      [],
      [],
    ],
    isArray: true,
    required: false,
  })
  dateOverrides?: DateOverride[];
}
