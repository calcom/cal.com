import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";

import { CALENDARS, SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

/**
 * Calendar event status enum
 */
export enum CalendarEventStatus {
  ACCEPTED = "accepted",
  PENDING = "pending",
  DECLINED = "declined",
  CANCELLED = "cancelled",
}

/**
 * Base interface for all calendar event locations
 */
interface ICalendarEventLocation {
  type: string;
  uri: string;
  label?: string;
}

export class CalendarEventVideoLocation implements ICalendarEventLocation {
  @IsString()
  type = "video";

  @IsString()
  uri!: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  meetingCode?: string;

  @IsString()
  @IsOptional()
  accessCode?: string;
}

export class CalendarEventPhoneLocation implements ICalendarEventLocation {
  @IsString()
  type = "phone";

  @IsString()
  uri!: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  pin?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  accessCode?: string;

  @IsString()
  @IsOptional()
  regionCode?: string;
}

export class CalendarEventSipLocation implements ICalendarEventLocation {
  @IsString()
  type = "sip";

  @IsString()
  uri!: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  pin?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class CalendarEventMoreLocation implements ICalendarEventLocation {
  @IsString()
  type = "more";

  @IsString()
  uri!: string;

  @IsString()
  @IsOptional()
  label?: string;
}

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
      oneOf: [
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["video"] },
            uri: { type: "string" },
            label: { type: "string", nullable: true },
            password: { type: "string", nullable: true },
            meetingCode: { type: "string", nullable: true },
            accessCode: { type: "string", nullable: true },
          },
        },
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["phone"] },
            uri: { type: "string" },
            label: { type: "string", nullable: true },
            pin: { type: "string", nullable: true },
            password: { type: "string", nullable: true },
            accessCode: { type: "string", nullable: true },
            regionCode: { type: "string", nullable: true },
          },
        },
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["sip"] },
            uri: { type: "string" },
            label: { type: "string", nullable: true },
            pin: { type: "string", nullable: true },
            password: { type: "string", nullable: true },
          },
        },
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["more"] },
            uri: { type: "string" },
            label: { type: "string", nullable: true },
          },
        },
      ],
      discriminator: {
        propertyName: "type",
      },
    },
    nullable: true,
    description: "Conference locations with entry points (video, phone, sip, more)",
  })
  locations?: Array<
    | CalendarEventVideoLocation
    | CalendarEventPhoneLocation
    | CalendarEventSipLocation
    | CalendarEventMoreLocation
  > | null;

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
