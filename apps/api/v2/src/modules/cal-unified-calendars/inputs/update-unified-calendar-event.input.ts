import { ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsISO8601, IsOptional, IsString, ValidateNested, IsEnum, IsArray } from "class-validator";

import {
  CalendarEventLocation,
  CalendarEventVideoLocation,
  CalendarEventPhoneLocation,
  CalendarEventSipLocation,
  CalendarEventMoreLocation,
  CalendarEventAttendee,
  CalendarEventHost,
  CalendarEventStatus,
} from "../outputs/get-unified-calendar-event";

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
  @Type(() => Object, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: CalendarEventVideoLocation, name: "video" },
        { value: CalendarEventPhoneLocation, name: "phone" },
        { value: CalendarEventSipLocation, name: "sip" },
        { value: CalendarEventMoreLocation, name: "more" },
      ],
    },
  })
  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { $ref: getSchemaPath(CalendarEventVideoLocation) },
        { $ref: getSchemaPath(CalendarEventPhoneLocation) },
        { $ref: getSchemaPath(CalendarEventSipLocation) },
        { $ref: getSchemaPath(CalendarEventMoreLocation) },
      ],
      discriminator: {
        propertyName: "type",
      },
    },
    nullable: true,
    description: "Conference locations with entry points (video, phone, sip, more)",
  })
  locations?: CalendarEventLocation[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarEventAttendee)
  @ApiPropertyOptional({
    type: [CalendarEventAttendee],
    nullable: true,
    description: "List of attendees with their response status",
  })
  attendees?: CalendarEventAttendee[];

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
  @Type(() => CalendarEventHost)
  @ApiPropertyOptional({
    type: [CalendarEventHost],
    nullable: true,
    description: "Information about the event hosts (organizers)",
  })
  hosts?: CalendarEventHost[];
}
