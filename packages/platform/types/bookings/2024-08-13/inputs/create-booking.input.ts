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
} from "class-validator";

import type { BookingLanguageType } from "./language";
import { BookingLanguage } from "./language";

class Attendee {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsTimeZone()
  // note(Lauris): setup CapitalizeTimezone
  timeZone!: string;

  @IsEnum(BookingLanguage)
  @IsOptional()
  language?: BookingLanguageType;
}
export class CreateBookingInput_2024_08_13 {
  @IsDateString()
  start!: string;

  @IsInt()
  eventTypeId!: number;

  @ValidateNested()
  @Type(() => Attendee)
  attendee!: Attendee;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  guests?: string[];

  @IsUrl()
  @IsOptional()
  meetingUrl?: string;

  @IsObject()
  @IsOptional()
  metadata!: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  bookingFieldsResponses!: Record<string, unknown>;
}

export class RescheduleBookingInput_2024_08_13 {
  @IsDateString()
  start!: string;

  @IsString()
  rescheduleBookingUid!: string;
}
