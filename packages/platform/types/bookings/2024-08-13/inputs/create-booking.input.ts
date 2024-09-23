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
} from "class-validator";

import type { BookingLanguageType } from "./language";
import { BookingLanguage } from "./language";

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

  @ApiPropertyOptional({
    type: String,
    description:
      "Meeting URL just for this booking. Displayed in email and calendar event. If not provided then cal video link will be generated.",
    example: "https://example.com/meeting",
  })
  @IsUrl()
  @IsOptional()
  meetingUrl?: string;

  // todo(Lauris): expose after refactoring metadata https://app.campsite.co/cal/posts/zysq8w9rwm9c
  // @ApiProperty({
  //   type: Object,
  //   description: "Optional metadata for the booking.",
  //   example: { key: "value" },
  //   required: false,
  // })
  // @IsObject()
  // @IsOptional()
  // metadata!: Record<string, unknown>;

  @ApiPropertyOptional({
    type: Object,
    description: "Booking field responses.",
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

export class CreateRecurringBookingInput_2024_08_13 {
  @ApiProperty({
    type: String,
    description: "The start time of the booking in ISO 8601 format in UTC timezone.",
    example: "2024-08-13T09:00:00Z",
  })
  @IsDateString()
  start!: string;

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

  @ApiProperty({
    type: [String],
    description: "An optional list of guest emails attending the event.",
    example: ["guest1@example.com", "guest2@example.com"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  guests?: string[];

  @ApiProperty({
    type: String,
    description:
      "Meeting URL just for this booking. Displayed in email and calendar event. If not provided then cal video link will be generated.",
    example: "https://example.com/meeting",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  meetingUrl?: string;

  // todo(Lauris): expose after refactoring metadata https://app.campsite.co/cal/posts/zysq8w9rwm9c
  // @ApiProperty({
  //   type: Object,
  //   description: "Optional metadata for the booking.",
  //   example: { key: "value" },
  //   required: false,
  // })
  // @IsObject()
  // @IsOptional()
  // metadata!: Record<string, unknown>;

  @ApiProperty({
    type: Object,
    description: "Booking field responses.",
    example: { customField: "customValue" },
    required: false,
  })
  @IsObject()
  @IsOptional()
  bookingFieldsResponses?: Record<string, unknown>;
}
