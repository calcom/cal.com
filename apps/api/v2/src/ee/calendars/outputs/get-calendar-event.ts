import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class DateTimeWithZone {
  @IsISO8601()
  time!: string;

  @IsString()
  timeZone!: string;
}

export class CalendarEventOutput {
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
    description: "Title or summary of the calendar event",
  })
  summary!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Detailed description of the calendar event",
  })
  description?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Location of the calendar event",
  })
  location?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "URL to access the video conference",
  })
  meetingUrl?: string | null;

  @IsOptional()
  @ApiPropertyOptional({
    type: "object",
    nullable: true,
    description: "Conference data including entry points (video, phone, etc.)",
  })
  conferenceData?: Record<string, any>;

  @IsOptional()
  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "object",
      properties: {
        email: { type: "string" },
        name: { type: "string" },
        responseStatus: { type: "string" },
        organizer: { type: "boolean" },
        self: { type: "boolean" },
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
    description: "Information about the event organizer",
  })
  organizer?: {
    email: string;
    name?: string;
  } | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Source or origin of the calendar event, e.g., "google", "outlook"',
  })
  source?: string | null;
}

export class GetCalendarEventOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => CalendarEventOutput)
  @ApiProperty({ type: CalendarEventOutput })
  data!: CalendarEventOutput;
}
