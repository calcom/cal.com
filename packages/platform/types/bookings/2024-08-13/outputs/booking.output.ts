import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsEmail,
  IsTimeZone,
  IsUrl,
  ValidateNested,
} from "class-validator";

import type { BookingLanguageType } from "../inputs/language";
import { BookingLanguage } from "../inputs/language";

class Attendee {
  @ApiProperty({ type: String, example: "John Doe" })
  @IsString()
  @Expose()
  name!: string;

  @ApiProperty({ type: String, example: "john@example.com" })
  @IsString()
  @Expose()
  email!: string;

  @ApiProperty({ type: String, example: "America/New_York" })
  @IsTimeZone()
  @Expose()
  timeZone!: string;

  @ApiProperty({ enum: BookingLanguage, required: false, example: "en" })
  @IsEnum(BookingLanguage)
  @Expose()
  @IsOptional()
  language?: BookingLanguageType;

  @ApiProperty({ type: Boolean, example: false })
  @IsBoolean()
  @Expose()
  absent!: boolean;
}

export class SeatedAttendee extends Attendee {
  @ApiProperty({ type: String, example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1" })
  @IsString()
  @Expose()
  seatUid!: string;

  @ApiProperty({
    type: Object,
    description:
      "Booking field responses consisting of an object with booking field slug as keys and user response as values.",
    example: { customField: "customValue" },
    required: false,
  })
  @IsObject()
  @Expose()
  bookingFieldsResponses!: Record<string, unknown>;

  @ApiProperty({
    type: Object,
    example: { key: "value" },
    required: false,
  })
  @IsObject()
  @IsOptional()
  @Expose()
  metadata?: Record<string, string>;
}

class BookingHost {
  @ApiProperty({ type: Number, example: 1 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "Jane Doe" })
  @IsString()
  @Expose()
  name!: string;

  @ApiProperty({ type: String, example: "jane100" })
  @IsString()
  @Expose()
  username!: string;

  @ApiProperty({ type: String, example: "America/Los_Angeles" })
  @IsTimeZone()
  @Expose()
  timeZone!: string;
}

class EventType {
  @ApiProperty({ type: Number, example: 1 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "some-event" })
  @IsString()
  @Expose()
  slug!: string;
}

class BaseBookingOutput_2024_08_13 {
  @ApiProperty({ type: Number, example: 123 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "booking_uid_123" })
  @IsString()
  @Expose()
  uid!: string;

  @ApiProperty({ type: String, example: "Consultation" })
  @IsString()
  @Expose()
  title!: string;

  @ApiProperty({ type: String, example: "Learn how to integrate scheduling into marketplace." })
  @IsString()
  @Expose()
  description!: string;

  @ApiProperty({ type: [BookingHost] })
  @ValidateNested({ each: true })
  @Type(() => BookingHost)
  @Expose()
  hosts!: BookingHost[];

  @ApiProperty({ enum: ["cancelled", "accepted", "rejected", "pending"], example: "accepted" })
  @IsEnum(["cancelled", "accepted", "rejected", "pending"])
  @Expose()
  status!: "cancelled" | "accepted" | "rejected" | "pending";

  @ApiProperty({ type: String, required: false, example: "User requested cancellation" })
  @IsString()
  @IsOptional()
  @Expose()
  cancellationReason?: string;

  @ApiProperty({ type: String, required: false, example: "User rescheduled the event" })
  @IsString()
  @IsOptional()
  @Expose()
  reschedulingReason?: string;

  @ApiProperty({ type: String, required: false, example: "previous_uid_123" })
  @IsString()
  @IsOptional()
  @Expose()
  rescheduledFromUid?: string;

  @ApiProperty({ type: String, example: "2024-08-13T15:30:00Z" })
  @IsDateString()
  @Expose()
  start!: string;

  @ApiProperty({ type: String, example: "2024-08-13T16:30:00Z" })
  @IsDateString()
  @Expose()
  end!: string;

  @ApiProperty({ type: Number, example: 60 })
  @IsInt()
  @Expose()
  duration!: number;

  @ApiProperty({
    type: Number,
    example: 50,
    deprecated: true,
    description: "Deprecated - rely on 'eventType' object containing the id instead.",
  })
  @IsInt()
  @Expose()
  eventTypeId!: number;

  @ApiProperty({ type: EventType })
  @Type(() => EventType)
  @Expose()
  eventType!: EventType;

  @ApiProperty({
    type: String,
    required: false,
    description: "Deprecated - rely on 'location' field instead.",
    example: "https://example.com/recurring-meeting",
    deprecated: true,
  })
  @IsUrl()
  @IsOptional()
  @Expose()
  meetingUrl?: string;

  @ApiProperty({ type: String, required: false, example: "https://example.com/meeting" })
  @IsOptional()
  @Expose()
  location!: string;

  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  @Expose()
  absentHost!: boolean;

  @ApiProperty({ type: String, example: "2024-08-13T15:30:00Z" })
  @IsDateString()
  @Expose()
  createdAt!: string;

  @ApiProperty({
    type: Object,
    example: { key: "value" },
    required: false,
  })
  @IsObject()
  @IsOptional()
  @Expose()
  metadata?: Record<string, string>;
}

export class BookingOutput_2024_08_13 extends BaseBookingOutput_2024_08_13 {
  @ApiProperty({ type: [Attendee] })
  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @Expose()
  attendees!: Attendee[];

  @ApiProperty({ type: [String], required: false, example: ["guest1@example.com", "guest2@example.com"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  guests?: string[];

  @ApiProperty({
    type: Object,
    description:
      "Booking field responses consisting of an object with booking field slug as keys and user response as values.",
    example: { customField: "customValue" },
    required: false,
  })
  @IsObject()
  @Expose()
  bookingFieldsResponses!: Record<string, unknown>;
}

export class RecurringBookingOutput_2024_08_13 extends BookingOutput_2024_08_13 {
  @ApiProperty({ type: String, example: "recurring_uid_987" })
  @IsString()
  @Expose()
  recurringBookingUid!: string;

  @ApiProperty({
    type: Object,
    description:
      "Booking field responses consisting of an object with booking field slug as keys and user response as values.",
    example: { customField: "customValue" },
    required: false,
  })
  @IsObject()
  @Expose()
  bookingFieldsResponses!: Record<string, unknown>;
}

export class GetSeatedBookingOutput_2024_08_13 extends BaseBookingOutput_2024_08_13 {
  @ApiProperty({ type: [SeatedAttendee] })
  @ValidateNested({ each: true })
  @Type(() => SeatedAttendee)
  @Expose()
  attendees!: SeatedAttendee[];
}

export class GetRecurringSeatedBookingOutput_2024_08_13 extends BaseBookingOutput_2024_08_13 {
  @ApiProperty({ type: [SeatedAttendee] })
  @ValidateNested({ each: true })
  @Type(() => SeatedAttendee)
  @Expose()
  attendees!: SeatedAttendee[];

  @ApiProperty({ type: String, example: "recurring_uid_987" })
  @IsString()
  @Expose()
  recurringBookingUid!: string;
}

// note(Lauris): CreateSeatedBookingOutput_2024_08_13 is the same as GetSeatedBookingOutput_2024_08_13 except it has seatUid, so instead of extending BaseBookingOutput_2024_08_13
// we could extend GetSeatedBookingOutput_2024_08_13 but the problem then is that attendees end up at the top of the response even above id
// or uid keys making it harder to read and understand the response, so i decided to duplicate the fields here and the response is as expected - with seatUid and attendees at the bottom.
export class CreateSeatedBookingOutput_2024_08_13 extends BaseBookingOutput_2024_08_13 {
  @ApiProperty({ type: String, example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1" })
  @IsString()
  @Expose()
  seatUid!: string;

  @ApiProperty({ type: [SeatedAttendee] })
  @ValidateNested({ each: true })
  @Type(() => SeatedAttendee)
  @Expose()
  attendees!: SeatedAttendee[];
}

// note(Lauris): CreateRecurringSeatedBookingOutput_2024_08_13 is the same as GetRecurringSeatedBookingOutput_2024_08_13 except it has seatUid, so instead of extending BaseBookingOutput_2024_08_13
// we could extend GetRecurringSeatedBookingOutput_2024_08_13 but the problem then is that attendees and recurringBookingUid end up at the top of the response even above id
// or uid keys making it harder to read and understand the response, so i decided to duplicate the fields here and the response is as expected - with seatUid, attendees and recurringBookingUid at the bottom.
export class CreateRecurringSeatedBookingOutput_2024_08_13 extends BaseBookingOutput_2024_08_13 {
  @ApiProperty({ type: String, example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1" })
  @IsString()
  @Expose()
  seatUid!: string;

  @ApiProperty({ type: [SeatedAttendee] })
  @ValidateNested({ each: true })
  @Type(() => SeatedAttendee)
  @Expose()
  attendees!: SeatedAttendee[];

  @ApiProperty({ type: String, example: "recurring_uid_987" })
  @IsString()
  @Expose()
  recurringBookingUid!: string;
}

class ReassignedToDto {
  @ApiProperty({ type: Number, example: 123 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "John Doe" })
  @IsString()
  @Expose()
  name!: string;

  @ApiProperty({ type: String, example: "john.doe@example.com" })
  @IsEmail()
  @Expose()
  email!: string;
}

export class ReassignBookingOutput_2024_08_13 {
  @ApiProperty({ type: String, example: "booking_uid_123" })
  @IsString()
  @Expose()
  bookingUid!: string;

  @ApiProperty({ type: ReassignedToDto })
  @ValidateNested()
  @Type(() => ReassignedToDto)
  @Expose()
  reassignedTo!: ReassignedToDto;
}
