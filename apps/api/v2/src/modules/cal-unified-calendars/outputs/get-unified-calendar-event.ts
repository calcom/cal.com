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
            type: {
              type: "string",
              enum: ["video"],
              description: "Indicates this is a video conference location",
            },
            uri: { type: "string", description: "URL for joining the video conference" },
            label: { type: "string", nullable: true, description: "Display name for the video conference" },
            password: {
              type: "string",
              nullable: true,
              description: "Password required to join the video conference",
            },
            meetingCode: {
              type: "string",
              nullable: true,
              description: "Meeting code or ID required to join the conference",
            },
            accessCode: {
              type: "string",
              nullable: true,
              description: "Access code required to join the conference",
            },
          },
        },
        {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["phone"],
              description: "Indicates this is a phone conference location",
            },
            uri: { type: "string", description: "Phone number or URI for dialing into the conference" },
            label: { type: "string", nullable: true, description: "Display name for the phone conference" },
            pin: {
              type: "string",
              nullable: true,
              description: "PIN number required for the phone conference",
            },
            password: {
              type: "string",
              nullable: true,
              description: "Password required for the phone conference",
            },
            accessCode: {
              type: "string",
              nullable: true,
              description: "Access code required for the phone conference",
            },
            regionCode: {
              type: "string",
              nullable: true,
              description: "Country/region code for the phone number",
            },
          },
        },
        {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["sip"],
              description: "Indicates this is a SIP (Session Initiation Protocol) conference location",
            },
            uri: { type: "string", description: "SIP URI for joining the conference" },
            label: { type: "string", nullable: true, description: "Display name for the SIP conference" },
            pin: {
              type: "string",
              nullable: true,
              description: "PIN number required for the SIP conference",
            },
            password: {
              type: "string",
              nullable: true,
              description: "Password required for the SIP conference",
            },
          },
        },
        {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["more"],
              description: "Indicates this is an additional conference location type",
            },
            uri: { type: "string", description: "URI for accessing this location" },
            label: { type: "string", nullable: true, description: "Display name for this location" },
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
  locations?:
    | Array<
        | CalendarEventVideoLocation
        | CalendarEventPhoneLocation
        | CalendarEventSipLocation
        | CalendarEventMoreLocation
      >
    | [];

  @IsOptional()
  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address of the attendee" },
        name: { type: "string", description: "Display name of the attendee" },
        responseStatus: {
          type: "string",
          nullable: true,
          description: "Attendee's response to the invitation (accepted, declined, tentative, needs_action)",
        },
        self: {
          type: "boolean",
          nullable: true,
          description: "Indicates if this attendee is the current user",
        },
        optional: {
          type: "boolean",
          nullable: true,
          description: "Indicates if this attendee's attendance is optional",
        },
      },
    },
    nullable: true,
    description: "List of attendees with their response status",
  })
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
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
    properties: {
      email: { type: "string", description: "Email address of the event organizer" },
      name: { type: "string", nullable: true, description: "Display name of the event organizer" },
    },
    nullable: true,
    description: "Information about the event organizer/host",
  })
  organizer?: {
    email: string;
    name?: string;
  } | null;

  @IsEnum(CALENDARS)
  @ApiProperty({
    enum: CALENDARS,
    enumName: "CalendarSource",
    description:
      "Calendar integration source (e.g., Google Calendar, Office 365, Apple Calendar). Currently only Google Calendar is supported.",
    example: "google",
  })
  source: (typeof CALENDARS)[number];
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
