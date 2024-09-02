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
  @IsString()
  @Expose()
  name!: string;

  @IsTimeZone()
  @Expose()
  // note(Lauris): setup CapitalizeTimezone
  timeZone!: string;

  @IsEnum(BookingLanguage)
  @Expose()
  @IsOptional()
  language?: BookingLanguageType;

  @IsBoolean()
  @Expose()
  absent!: boolean;
}

class Host {
  @IsInt()
  @Expose()
  id!: number;

  @IsString()
  @Expose()
  name!: string;

  @IsTimeZone()
  @Expose()
  // note(Lauris): setup CapitalizeTimezone
  timeZone!: string;
}

export class BookingOutput_2024_08_13 {
  @IsInt()
  @Expose()
  id!: number;

  @IsString()
  @Expose()
  uid!: string;

  @ValidateNested({ each: true })
  @Type(() => Host)
  @Expose()
  hosts!: Host[];

  @IsEnum(["cancelled", "accepted", "rejected", "pending", "rescheduled"])
  @Expose()
  status!: "cancelled" | "accepted" | "rejected" | "pending" | "rescheduled";

  @IsString()
  @IsOptional()
  @Expose()
  cancellationReason?: string;

  @IsString()
  @IsOptional()
  @Expose()
  reschedulingReason?: string;

  @IsString()
  @IsOptional()
  @Expose()
  rescheduledFromUid?: string;

  @IsString()
  @IsOptional()
  @Expose()
  rescheduledToUid?: string;

  @IsDateString()
  @Expose()
  start!: string;

  @IsDateString()
  @Expose()
  end!: string;

  @IsInt()
  @Expose()
  duration!: number;

  @IsInt()
  @Expose()
  eventTypeId!: number;

  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @Expose()
  attendees!: Attendee[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  guests?: string[];

  @IsUrl()
  @IsOptional()
  @Expose()
  meetingUrl?: string;

  @IsBoolean()
  @Expose()
  absentHost!: boolean;
}

export class RecurringBookingOutput_2024_08_13 {
  @IsInt()
  @Expose()
  id!: number;

  @IsString()
  @Expose()
  uid!: string;

  @ValidateNested({ each: true })
  @Type(() => Host)
  @Expose()
  hosts!: Host[];

  @IsEnum(["cancelled", "accepted", "rejected", "pending"])
  @Expose()
  status!: "cancelled" | "accepted" | "rejected" | "pending";

  @IsString()
  @IsOptional()
  @Expose()
  cancellationReason?: string;

  @IsDateString()
  @Expose()
  start!: string;

  @IsDateString()
  @Expose()
  end!: string;

  @IsInt()
  @Expose()
  duration!: number;

  @IsInt()
  @Expose()
  eventTypeId!: number;

  @IsString()
  @Expose()
  recurringBookingUid!: string;

  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @Expose()
  attendees!: Attendee[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  guests?: string[];

  @IsUrl()
  @IsOptional()
  @Expose()
  meetingUrl?: string;

  @IsBoolean()
  @Expose()
  absentHost!: boolean;
}
