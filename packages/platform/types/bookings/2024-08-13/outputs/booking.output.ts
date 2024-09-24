import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
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

class Host {
  @ApiProperty({ type: Number, example: 1 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "Jane Doe" })
  @IsString()
  @Expose()
  name!: string;

  @ApiProperty({ type: String, example: "America/Los_Angeles" })
  @IsTimeZone()
  @Expose()
  timeZone!: string;
}

export class BookingOutput_2024_08_13 {
  @ApiProperty({ type: Number, example: 123 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "booking_uid_123" })
  @IsString()
  @Expose()
  uid!: string;

  @ApiProperty({ type: [Host] })
  @ValidateNested({ each: true })
  @Type(() => Host)
  @Expose()
  hosts!: Host[];

  @ApiProperty({ enum: ["cancelled", "accepted", "rejected", "pending", "rescheduled"], example: "accepted" })
  @IsEnum(["cancelled", "accepted", "rejected", "pending", "rescheduled"])
  @Expose()
  status!: "cancelled" | "accepted" | "rejected" | "pending" | "rescheduled";

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

  @ApiProperty({ type: Number, example: 45 })
  @IsInt()
  @Expose()
  eventTypeId!: number;

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

  @ApiProperty({ type: String, required: false, example: "https://example.com/meeting" })
  @IsUrl()
  @IsOptional()
  @Expose()
  meetingUrl?: string;

  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  @Expose()
  absentHost!: boolean;
}

export class RecurringBookingOutput_2024_08_13 {
  @ApiProperty({ type: Number, example: 456 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "recurring_uid_123" })
  @IsString()
  @Expose()
  uid!: string;

  @ApiProperty({ type: [Host] })
  @ValidateNested({ each: true })
  @Type(() => Host)
  @Expose()
  hosts!: Host[];

  @ApiProperty({ enum: ["cancelled", "accepted", "rejected", "pending"], example: "pending" })
  @IsEnum(["cancelled", "accepted", "rejected", "pending"])
  @Expose()
  status!: "cancelled" | "accepted" | "rejected" | "pending";

  @ApiProperty({ type: String, required: false, example: "Event was cancelled" })
  @IsString()
  @IsOptional()
  @Expose()
  cancellationReason?: string;

  @ApiProperty({ type: String, required: false, example: "Event was rescheduled" })
  @IsString()
  @IsOptional()
  @Expose()
  reschedulingReason?: string;

  @ApiProperty({ type: String, required: false, example: "previous_recurring_uid_123" })
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

  @ApiProperty({ type: Number, example: 30 })
  @IsInt()
  @Expose()
  duration!: number;

  @ApiProperty({ type: Number, example: 50 })
  @IsInt()
  @Expose()
  eventTypeId!: number;

  @ApiProperty({ type: String, example: "recurring_uid_987" })
  @IsString()
  @Expose()
  recurringBookingUid!: string;

  @ApiProperty({ type: [Attendee] })
  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @Expose()
  attendees!: Attendee[];

  @ApiProperty({ type: [String], required: false, example: ["guest3@example.com", "guest4@example.com"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  guests?: string[];

  @ApiProperty({ type: String, required: false, example: "https://example.com/recurring-meeting" })
  @IsUrl()
  @IsOptional()
  @Expose()
  meetingUrl?: string;

  @ApiProperty({ type: Boolean, example: false })
  @IsBoolean()
  @Expose()
  absentHost!: boolean;
}
