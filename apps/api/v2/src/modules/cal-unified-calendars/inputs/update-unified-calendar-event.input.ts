import { ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsISO8601, IsOptional, IsString, ValidateNested, IsEnum, IsArray } from "class-validator";

import { CalendarEventStatus, CalendarEventResponseStatus } from "../outputs/get-unified-calendar-event";

export class UpdateCalendarEventHost {
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: "Email address of the host (read-only, cannot be updated)",
  })
  email!: string;

  @IsEnum(CalendarEventResponseStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: CalendarEventResponseStatus,
    enumName: "CalendarEventResponseStatus",
    nullable: true,
    description: "Response status of the host (only field that can be updated)",
  })
  responseStatus?: CalendarEventResponseStatus | null;
}

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

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    enum: ["delete"],
    description: "Action to perform on this attendee. Use 'delete' to remove the attendee from the event.",
  })
  action?: "delete";

  @IsOptional()
  @ApiPropertyOptional({
    type: Boolean,
    description: "Whether the attendee is an organizer",
  })
  organizer?: boolean;
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
      "List of attendees with their response status. Attendees not included will be preserved from existing event. Use action: 'delete' to explicitly remove an attendee.",
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCalendarEventHost)
  @ApiPropertyOptional({
    type: [UpdateCalendarEventHost],
    nullable: true,
    description:
      "Information about the event hosts (organizers). Only responseStatus can be updated. When provided, replaces existing organizers.",
  })
  hosts?: UpdateCalendarEventHost[];
}
