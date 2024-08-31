import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  IsUrl,
  IsDateString,
  IsEmail,
} from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Metadata {
  @IsUrl()
  videoCallUrl!: string;
}

class Location {
  @IsString()
  optionValue!: string;

  @IsString()
  value!: string;
}

class Response {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  notes!: string;

  @IsArray()
  @IsString({ each: true })
  guests!: string[];

  @ValidateNested()
  @Type(() => Location)
  location!: Location;
}

class User {
  @IsInt()
  id!: number;

  @IsString()
  name!: string | null;

  @IsEmail()
  email!: string;

  @IsString()
  username!: string | null;

  @IsString()
  timeZone!: string;
}

class Attendee {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  timeZone!: string;
}

class EventType {
  @IsOptional()
  @IsString()
  eventName!: string | null;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  timeZone!: string | null;
}

class GetBookingData {
  @IsString()
  title!: string;

  @IsInt()
  id!: number;

  @IsString()
  uid!: string;

  @IsString()
  description!: string | null;

  @IsObject()
  customInputs!: any;

  @IsOptional()
  @IsString()
  smsReminderNumber!: string | null;

  @IsOptional()
  @IsString()
  recurringEventId!: string | null;

  @IsDateString()
  startTime!: Date;

  @IsDateString()
  endTime!: Date;

  @IsUrl()
  location!: string | null;

  @IsString()
  status!: string;

  metadata!: Metadata | any;

  @IsOptional()
  @IsString()
  cancellationReason!: string | null;

  @ValidateNested()
  @Type(() => Response)
  responses!: Response | any;

  @IsOptional()
  @IsString()
  rejectionReason!: string | null;

  @IsString()
  @IsEmail()
  userPrimaryEmail!: string | null;

  @ValidateNested()
  @Type(() => User)
  user!: User | null;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  attendees!: Attendee[];

  @IsInt()
  eventTypeId!: number | null;

  @ValidateNested()
  @Type(() => EventType)
  eventType!: EventType | null;
}

export class GetBookingOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: GetBookingData,
  })
  @ValidateNested()
  @Type(() => GetBookingData)
  data!: GetBookingData;
}
