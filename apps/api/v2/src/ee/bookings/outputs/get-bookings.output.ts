import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsUrl,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  IsDateString,
  IsEmail,
} from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

enum Status {
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
  ACCEPTED = "ACCEPTED",
  PENDING = "PENDING",
  AWAITING_HOST = "AWAITING_HOST",
}

class Attendee {
  @IsInt()
  id!: number;

  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  timeZone!: string;

  @IsString()
  locale!: string | null;

  @IsInt()
  bookingId!: number | null;
}

class EventType {
  @IsString()
  @IsOptional()
  slug?: string;

  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  @IsString()
  eventName?: string | null;

  @IsInt()
  price!: number;

  @IsOptional()
  recurringEvent?: any;

  @IsString()
  currency!: string;

  @IsObject()
  metadata!: any;

  @IsBoolean()
  @IsOptional()
  seatsShowAttendees?: boolean | undefined | null;

  @IsBoolean()
  @IsOptional()
  seatsShowAvailabilityCount?: boolean | undefined | null;

  @IsOptional()
  team?: any | null;
}

class Reference {
  @IsInt()
  id!: number;

  @IsString()
  type!: string;

  @IsString()
  uid!: string;

  @IsOptional()
  @IsString()
  meetingId?: string | null;

  @IsOptional()
  @IsString()
  thirdPartyRecurringEventId?: string | null;

  @IsString()
  meetingPassword!: string | null;

  @IsOptional()
  @IsString()
  meetingUrl?: string | null;

  @IsInt()
  bookingId!: number | null;

  @IsEmail()
  externalCalendarId!: string | null;

  @IsOptional()
  deleted?: any;

  @IsInt()
  credentialId!: number | null;
}

class User {
  @IsInt()
  id!: number;

  @IsString()
  name!: string | null;

  @IsEmail()
  email!: string;
}

class GetBookingsDataEntry {
  @IsInt()
  id!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsEmail()
  userPrimaryEmail?: string | null;

  @IsString()
  description!: string | null;

  @IsObject()
  customInputs!: object | any;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @IsArray()
  attendees!: Attendee[];

  metadata!: any;

  @IsString()
  uid!: string;

  @IsOptional()
  @IsString()
  recurringEventId!: string | null;

  @IsUrl()
  location!: string | null;

  @ValidateNested()
  @Type(() => EventType)
  eventType!: EventType;

  @IsEnum(Status)
  status!: "CANCELLED" | "REJECTED" | "ACCEPTED" | "PENDING" | "AWAITING_HOST";

  @IsBoolean()
  paid!: boolean;

  @IsArray()
  payment!: any[];

  @ValidateNested()
  @Type(() => Reference)
  @IsArray()
  references!: Reference[];

  @IsBoolean()
  isRecorded!: boolean;

  @IsArray()
  seatsReferences!: any[];

  @ValidateNested()
  @Type(() => User)
  user!: User | null;

  @IsOptional()
  rescheduled?: any;
}

class GetBookingsData {
  @ValidateNested()
  @Type(() => GetBookingsDataEntry)
  @IsArray()
  bookings!: GetBookingsDataEntry[];

  @IsArray()
  recurringInfo!: any[];

  @IsInt()
  nextCursor!: number | null;
}

export class GetBookingsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: GetBookingsData,
  })
  @ValidateNested()
  @Type(() => GetBookingsData)
  data!: GetBookingsData;
}
