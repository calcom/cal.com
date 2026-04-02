import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

const Status = {
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  ACCEPTED: "ACCEPTED",
  PENDING: "PENDING",
  AWAITING_HOST: "AWAITING_HOST",
} as const;

export type Status = (typeof Status)[keyof typeof Status];

class Attendee {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsString()
  @ApiProperty()
  timeZone!: string;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  locale!: string | null;

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  bookingId!: number | null;
}

class EventType {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  slug?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  id?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  eventName?: string | null;

  @IsInt()
  @ApiProperty()
  price!: number;

  @IsOptional()
  @ApiPropertyOptional()
  recurringEvent?: any;

  @IsString()
  @ApiProperty()
  currency!: string;

  @IsObject()
  @ApiProperty()
  metadata!: any;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, nullable: true })
  seatsShowAttendees?: boolean | null;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, nullable: true })
  seatsShowAvailabilityCount?: boolean | null;

  @IsOptional()
  @ApiPropertyOptional({ nullable: true })
  team?: any | null;
}

class Reference {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty()
  type!: string;

  @IsString()
  @ApiProperty()
  uid!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  meetingId?: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  thirdPartyRecurringEventId?: string | null;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  meetingPassword!: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  meetingUrl?: string | null;

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  bookingId!: number | null;

  @IsEmail()
  @ApiProperty({ type: String, nullable: true })
  externalCalendarId!: string | null;

  @IsOptional()
  @ApiPropertyOptional()
  deleted?: any;

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  credentialId!: number | null;
}

class User {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @IsEmail()
  @ApiProperty()
  email!: string;
}

export class GetBookingsDataEntry {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty()
  title!: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ type: String, nullable: true })
  userPrimaryEmail?: string | null;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @IsObject()
  @ApiProperty({ type: Object })
  customInputs!: object | any;

  @IsDateString()
  @ApiProperty()
  startTime!: string;

  @IsDateString()
  @ApiProperty()
  endTime!: string;

  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @IsArray()
  @ApiProperty({ type: [Attendee] })
  attendees!: Attendee[];

  @ApiProperty()
  metadata!: any;

  @IsString()
  @ApiProperty()
  uid!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  recurringEventId!: string | null;

  @IsUrl()
  @ApiProperty({ type: String, nullable: true })
  location!: string | null;

  @ValidateNested()
  @Type(() => EventType)
  @ApiProperty({ type: EventType })
  eventType!: EventType;

  @IsEnum(Status)
  @ApiProperty({ enum: Status, type: String })
  status!: Status;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  paid!: boolean;

  @IsArray()
  @ApiProperty()
  payment!: any[];

  @ValidateNested()
  @Type(() => Reference)
  @IsArray()
  @ApiProperty({ type: [Reference] })
  references!: Reference[];

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  isRecorded!: boolean;

  @IsArray()
  @ApiProperty()
  seatsReferences!: any[];

  @ValidateNested()
  @Type(() => User)
  @ApiProperty({ type: User })
  user!: User | null;

  @IsOptional()
  @ApiPropertyOptional()
  rescheduled?: any;
}

class GetBookingsData_2024_04_15 {
  @ValidateNested()
  @Type(() => GetBookingsDataEntry)
  @IsArray()
  @ApiProperty({ type: [GetBookingsDataEntry] })
  bookings!: GetBookingsDataEntry[];

  @IsArray()
  @ApiProperty()
  recurringInfo!: any[];

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  nextCursor!: number | null;
}

export class GetBookingsOutput_2024_04_15 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS], type: String })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: GetBookingsData_2024_04_15,
  })
  @ValidateNested()
  @Type(() => GetBookingsData_2024_04_15)
  data!: GetBookingsData_2024_04_15;
}
