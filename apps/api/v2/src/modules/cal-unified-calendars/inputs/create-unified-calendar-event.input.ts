import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsTimeZone,
  ValidateNested,
} from "class-validator";

export class CreateEventDateTimeWithZone {
  @IsISO8601()
  @ApiProperty({
    type: String,
    format: "date-time",
    description: "Start or end time in ISO 8601 format",
  })
  time!: string;

  @IsTimeZone()
  @ApiProperty({
    type: String,
    description: "IANA time zone (e.g. America/New_York)",
  })
  timeZone!: string;
}

export class CreateEventAttendee {
  @IsEmail()
  @ApiProperty({
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
}

export class CreateUnifiedCalendarEventInput {
  @IsString()
  @ApiProperty({
    type: String,
    description: "Title of the calendar event",
  })
  title!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateEventDateTimeWithZone)
  @ApiProperty({
    type: CreateEventDateTimeWithZone,
    description: "Start date and time with time zone",
  })
  start!: CreateEventDateTimeWithZone;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateEventDateTimeWithZone)
  @ApiProperty({
    type: CreateEventDateTimeWithZone,
    description: "End date and time with time zone",
  })
  end!: CreateEventDateTimeWithZone;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Description of the event",
  })
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventAttendee)
  @ApiPropertyOptional({
    type: [CreateEventAttendee],
    description: "List of attendees",
  })
  attendees?: CreateEventAttendee[];
}
