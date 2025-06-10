import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";

import { CALENDARS, SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class DateTimeWithZone {
  @IsISO8601()
  time!: string;

  @IsString()
  timeZone!: string;
}

export class UnifiedCalendarEventOutput {
  @ValidateNested()
  @Type(() => DateTimeWithZone)
  @ApiProperty({
    type: "object",
    properties: {
      time: { type: "string", format: "date-time" },
      timeZone: { type: "string" },
    },
    description: "Start date and time of the calendar event with timezone information",
  })
  start!: DateTimeWithZone;

  @ValidateNested()
  @Type(() => DateTimeWithZone)
  @ApiProperty({
    type: "object",
    properties: {
      time: { type: "string", format: "date-time" },
      timeZone: { type: "string" },
    },
    description: "End date and time of the calendar event with timezone information",
  })
  end!: DateTimeWithZone;

  @IsString()
  @ApiProperty({
    type: String,
    description: "Unique identifier of the calendar event",
  })
  id!: string;

  @IsString()
  @ApiProperty({
    type: String,
    description: "Title of the calendar event",
  })
  title!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Detailed description of the calendar event",
  })
  description?: string | null;

  @IsOptional()
  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "object",
      properties: {
        entryPointType: { type: "string" },
        uri: { type: "string" },
        label: { type: "string" },
        pin: { type: "string", nullable: true },
        regionCode: { type: "string", nullable: true },
      },
    },
    nullable: true,
    description: "Conference locations with entry points (video, phone, etc.)",
  })
  locations?: Array<{
    entryPointType: string;
    uri: string;
    label?: string;
    pin?: string;
    regionCode?: string;
  }> | null;

  @IsOptional()
  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "object",
      properties: {
        email: { type: "string" },
        name: { type: "string" },
        responseStatus: { type: "string", nullable: true },
        organizer: { type: "boolean", nullable: true },
        self: { type: "boolean", nullable: true },
        optional: { type: "boolean", nullable: true },
      },
    },
    nullable: true,
    description: "List of attendees with their response status",
  })
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
    organizer?: boolean;
    self?: boolean;
  }> | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Status of the event (confirmed, tentative, cancelled)",
  })
  status?: string | null;

  @IsOptional()
  @ApiPropertyOptional({
    type: "object",
    nullable: true,
    description: "Information about the event organizer/host",
  })
  organizer?: {
    email: string;
    name?: string;
  } | null;

  /**
   * Source or origin of the calendar event
   */
  @IsOptional()
  @IsEnum(CALENDARS)
  @ApiPropertyOptional({
    enum: CALENDARS,
    enumName: "CalendarSource",
    nullable: true,
    description:
      "Calendar integration source (e.g., Google Calendar, Office 365, Apple Calendar). Currently only Google Calendar is supported.",
    example: "google",
  })
  source?: (typeof CALENDARS)[number] | null;
}

export class GetUnifiedCalendarEventOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => UnifiedCalendarEventOutput)
  @ApiProperty({ type: UnifiedCalendarEventOutput })
  data!: UnifiedCalendarEventOutput;
}
