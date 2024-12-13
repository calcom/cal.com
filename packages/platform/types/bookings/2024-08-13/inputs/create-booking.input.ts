import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsDateString,
  IsTimeZone,
  IsEnum,
  IsEmail,
  ValidateNested,
  IsArray,
  IsString,
  IsOptional,
  IsUrl,
  IsObject,
  IsBoolean,
  Min,
} from "class-validator";

import type { BookingLanguageType } from "./language";
import { BookingLanguage } from "./language";
import { ValidateMetadata } from "./validators/validate-metadata";

class Attendee {
  @ApiProperty({
    type: String,
    description: "The name of the attendee.",
    example: "John Doe",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    type: String,
    description: "The email of the attendee.",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    type: String,
    description: "The time zone of the attendee.",
    example: "America/New_York",
  })
  @IsTimeZone()
  timeZone!: string;

  @ApiPropertyOptional({
    enum: BookingLanguage,
    description: "The preferred language of the attendee. Used for booking confirmation.",
    example: BookingLanguage.it,
    default: BookingLanguage.en,
  })
  @IsEnum(BookingLanguage)
  @IsOptional()
  language?: BookingLanguageType;
}

export class CreateBookingInput_2024_08_13 {
  @ApiProperty({
    type: String,
    description: "The start time of the booking in ISO 8601 format in UTC timezone.",
    example: "2024-08-13T09:00:00Z",
  })
  @IsDateString()
  start!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({
    example: 30,
    description: `If it is an event type that has multiple possible lengths that attendee can pick from, you can pass the desired booking length here.
    If not provided then event type default length will be used for the booking.`,
  })
  lengthInMinutes?: number;

  @ApiProperty({
    type: Number,
    description: "The ID of the event type that is booked.",
    example: 123,
  })
  @IsInt()
  eventTypeId!: number;

  @ApiProperty({
    type: Attendee,
    description: "The attendee's details.",
  })
  @ValidateNested()
  @Type(() => Attendee)
  attendee!: Attendee;

  @ApiPropertyOptional({
    type: [String],
    description: "An optional list of guest emails attending the event.",
    example: ["guest1@example.com", "guest2@example.com"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  guests?: string[];

  @ApiProperty({
    type: String,
    description:
      "Deprecated - use 'location' instead. Meeting URL just for this booking. Displayed in email and calendar event. If not provided then cal video link will be generated.",
    example: "https://example.com/meeting",
    required: false,
    deprecated: true,
  })
  @IsUrl()
  @IsOptional()
  meetingUrl?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Location for this booking. Displayed in email and calendar event.",
    example: "https://example.com/meeting",
    required: false,
  })
  @IsOptional()
  location?: string;

  @ApiProperty({
    type: Object,
    description:
      "You can store any additional data you want here. Metadata must have at most 50 keys, each key up to 40 characters, and string values up to 500 characters.",
    example: { key: "value" },
    required: false,
  })
  @IsObject()
  @IsOptional()
  @ValidateMetadata({
    message:
      "Metadata must have at most 50 keys, each key up to 40 characters, and string values up to 500 characters.",
  })
  metadata?: Record<string, string>;

  @ApiPropertyOptional({
    type: Object,
    description:
      "Booking field responses consisting of an object with booking field slug as keys and user response as values.",
    example: { customField: "customValue" },
    required: false,
  })
  @IsObject()
  @IsOptional()
  bookingFieldsResponses?: Record<string, unknown>;
}

export class CreateInstantBookingInput_2024_08_13 extends CreateBookingInput_2024_08_13 {
  @ApiProperty({
    type: Boolean,
    description: "Flag indicating if the booking is an instant booking. Only available for team events.",
    example: true,
  })
  @IsBoolean()
  instant!: boolean;
}

export class CreateRecurringBookingInput_2024_08_13 extends CreateBookingInput_2024_08_13 {
  @ApiPropertyOptional({
    type: Number,
    description: `The number of recurrences. If not provided then event type recurrence count will be used. Can't be more than
    event type recurrence count`,
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceCount?: number;
}
