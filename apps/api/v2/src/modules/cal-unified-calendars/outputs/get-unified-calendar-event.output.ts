import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";

import { CALENDARS, SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export enum CalendarEventStatus {
  ACCEPTED = "accepted",
  PENDING = "pending",
  DECLINED = "declined",
  CANCELLED = "cancelled",
}

export enum CalendarEventResponseStatus {
  ACCEPTED = "accepted",
  PENDING = "pending",
  DECLINED = "declined",
  NEEDS_ACTION = "needsAction",
}

/**
 * Base interface for all calendar event locations
 */
export interface ICalendarEventLocation {
  type: string;
  url: string;
  label?: string;
}

export class CalendarEventVideoLocation implements ICalendarEventLocation {
  @IsString()
  @ApiProperty({
    enum: ["video"],
    description: "Indicates this is a video conference location",
  })
  type = "video";

  @IsString()
  @ApiProperty({
    description: "URL for joining the video conference",
  })
  url!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Display name for the video conference",
  })
  label?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Password required to join the video conference",
  })
  password?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Meeting code or ID required to join the conference",
  })
  meetingCode?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Access code required to join the conference",
  })
  accessCode?: string;
}

export class CalendarEventPhoneLocation implements ICalendarEventLocation {
  @IsString()
  @ApiProperty({
    enum: ["phone"],
    description: "Indicates this is a phone conference location",
  })
  type = "phone";

  @IsString()
  @ApiProperty({
    description: "Phone number or URL for dialing into the conference",
  })
  url!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Display name for the phone conference",
  })
  label?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "PIN number required for the phone conference",
  })
  pin?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Password required for the phone conference",
  })
  password?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Access code required for the phone conference",
  })
  accessCode?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Country/region code for the phone number",
  })
  regionCode?: string;
}

export class CalendarEventSipLocation implements ICalendarEventLocation {
  @IsString()
  @ApiProperty({
    enum: ["sip"],
    description: "Indicates this is a SIP (Session Initiation Protocol) conference location",
  })
  type = "sip";

  @IsString()
  @ApiProperty({
    description: "SIP URL for joining the conference",
  })
  url!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Display name for the SIP conference",
  })
  label?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "PIN number required for the SIP conference",
  })
  pin?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Password required for the SIP conference",
  })
  password?: string;
}

export class CalendarEventMoreLocation implements ICalendarEventLocation {
  @IsString()
  @ApiProperty({
    enum: ["more"],
    description: "Indicates this is an additional conference location type",
  })
  type = "more";

  @IsString()
  @ApiProperty({
    description: "URL for accessing this location",
  })
  url!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Display name for this location",
  })
  label?: string;
}

export type CalendarEventLocation =
  | CalendarEventVideoLocation
  | CalendarEventPhoneLocation
  | CalendarEventSipLocation
  | CalendarEventMoreLocation;

export class CalendarEventHost {
  @IsString()
  @ApiProperty({
    description: "Email address of the event host",
  })
  email!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Display name of the event host",
  })
  name?: string;

  @IsString()
  @IsOptional()
  @IsEnum(CalendarEventResponseStatus)
  @ApiPropertyOptional({
    enum: CalendarEventResponseStatus,
    nullable: true,
    enumName: "CalendarEventResponseStatus",
    description: "Host's response to the invitation",
    example: CalendarEventResponseStatus.ACCEPTED,
  })
  responseStatus!: CalendarEventResponseStatus | null;
}

export class calendarEventOwner {
  @IsString()
  @ApiProperty({
    description: "Email address of the event host",
  })
  email!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    nullable: true,
    description: "Display name of the event host",
  })
  name?: string;
}

export class CalendarEventAttendee {
  @IsString()
  @ApiProperty({
    description: "Email address of the attendee",
  })
  email!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Display name of the attendee",
  })
  name?: string;

  @IsString()
  @IsOptional()
  @IsEnum(CalendarEventResponseStatus)
  @ApiPropertyOptional({
    enum: CalendarEventResponseStatus,
    nullable: true,
    enumName: "CalendarEventResponseStatus",
    description: "Attendee's response to the invitation",
    example: CalendarEventResponseStatus.ACCEPTED,
  })
  responseStatus!: CalendarEventResponseStatus | null;

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

export class DateTimeWithZone {
  @IsISO8601()
  time!: string;

  @IsString()
  timeZone!: string;
}

@ApiExtraModels(
  CalendarEventVideoLocation,
  CalendarEventPhoneLocation,
  CalendarEventSipLocation,
  CalendarEventMoreLocation
)
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
  @ValidateNested({ each: true })
  @Type(() => CalendarEventHost)
  @ApiPropertyOptional({
    type: [CalendarEventHost],
    nullable: true,
    description: "Information about the event hosts (organizers)",
  })
  hosts?: CalendarEventHost[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => calendarEventOwner)
  @ApiPropertyOptional({
    type: calendarEventOwner,
    nullable: true,
    description:
      "The calendar account that owns this event. This is the primary calendar where the event is stored and cannot be modified without appropriate permissions. Changing this would require moving the event to a different calendar",
  })
  calendarEventOwner?: calendarEventOwner;

  @IsEnum(CALENDARS)
  @ApiProperty({
    enum: CALENDARS,
    enumName: "CalendarSource",
    description:
      "Calendar integration source (e.g., Google Calendar, Office 365, Apple Calendar). Currently only Google Calendar is supported.",
    example: "google",
  })
  source!: (typeof CALENDARS)[number];
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
