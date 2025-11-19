import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsISO8601, IsOptional, IsString, ValidateNested, IsEnum, IsArray } from "class-validator";

import {
  CalendarEventStatus,
  CalendarEventResponseStatus,
} from "../outputs/get-unified-calendar-event.output";

export class UpdateCalendarEventAttendee {
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: "Email address of the attendee",
  })
  email!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Display name of the attendee",
  })
  name?: string;

  @IsEnum(CalendarEventResponseStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: CalendarEventResponseStatus,
    enumName: "CalendarEventResponseStatus",
    nullable: true,
    description: "Response status of the attendee",
  })
  responseStatus?: CalendarEventResponseStatus | null;

  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Indicates if this attendee is the current user",
  })
  self?: boolean;

  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Indicates if this attendee's attendance is optional",
  })
  optional?: boolean;

  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Indicates if this attendee is the host",
  })
  host?: boolean;
}

export class UpdateDateTimeWithZone {
  @IsISO8601()
  @IsOptional()
  @ApiPropertyOptional({ type: "string", format: "date-time" })
  time?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  timeZone?: string;
}

export class UpdateUnifiedCalendarEventInput {
  @ValidateNested()
  @Type(() => UpdateDateTimeWithZone)
  @IsOptional()
  @ApiPropertyOptional({
    type: "object",
    properties: {
      time: { type: "string", format: "date-time" },
      timeZone: { type: "string" },
    },
    description: "Start date and time of the calendar event with timezone information",
  })
  start?: UpdateDateTimeWithZone;

  @ValidateNested()
  @Type(() => UpdateDateTimeWithZone)
  @IsOptional()
  @ApiPropertyOptional({
    type: "object",
    properties: {
      time: { type: "string", format: "date-time" },
      timeZone: { type: "string" },
    },
    description: "End date and time of the calendar event with timezone information",
  })
  end?: UpdateDateTimeWithZone;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Title of the calendar event",
  })
  title?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Detailed description of the calendar event",
  })
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCalendarEventAttendee)
  @ApiPropertyOptional({
    type: [UpdateCalendarEventAttendee],
    nullable: true,
    description:
      "List of attendees. CAUTION: You must pass the entire array with all updated values. Any attendees not included in this array will be removed from the event.",
  })
  attendees?: UpdateCalendarEventAttendee[];

  @IsEnum(CalendarEventStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: CalendarEventStatus,
    enumName: "CalendarEventStatus",
    nullable: true,
    description: "Status of the event (accepted, pending, declined, cancelled)",
    example: CalendarEventStatus.ACCEPTED,
  })
  status?: CalendarEventStatus | null;
}
