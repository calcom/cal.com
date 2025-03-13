import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  @ApiProperty()
  videoCallUrl!: string;
}

class Location {
  @IsString()
  @ApiProperty()
  optionValue!: string;

  @IsString()
  @ApiProperty()
  value!: string;
}

class Response {
  @IsString()
  @ApiProperty()
  name!: string;

  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsString()
  @ApiProperty()
  notes!: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  guests!: string[];

  @ValidateNested()
  @Type(() => Location)
  @ApiProperty({ type: Location })
  location!: Location;
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

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @IsString()
  @ApiProperty()
  timeZone!: string;
}

class Attendee {
  @IsString()
  @ApiProperty()
  name!: string;

  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsString()
  @ApiProperty()
  timeZone!: string;
}

class EventType {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  eventName!: string | null;

  @IsString()
  @ApiProperty()
  slug!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  timeZone!: string | null;
}

class GetBookingData_2024_04_15 {
  @IsString()
  @ApiProperty()
  title!: string;

  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty()
  uid!: string;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @IsObject()
  @ApiProperty({ type: Object })
  customInputs!: any;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  smsReminderNumber!: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  recurringEventId!: string | null;

  @IsDateString()
  @ApiProperty()
  startTime!: Date;

  @IsDateString()
  @ApiProperty()
  endTime!: Date;

  @IsUrl()
  @ApiProperty({ type: String, nullable: true })
  location!: string | null;

  @IsString()
  @ApiProperty()
  status!: string;

  @Type(() => Metadata)
  @ApiProperty({ type: Metadata })
  metadata!: Metadata | any;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  cancellationReason!: string | null;

  @ValidateNested()
  @Type(() => Response)
  @ApiProperty({ type: Response })
  responses!: Response | any;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  rejectionReason!: string | null;

  @IsString()
  @IsEmail()
  @ApiProperty({ type: String, nullable: true })
  userPrimaryEmail!: string | null;

  @ValidateNested()
  @Type(() => User)
  @ApiProperty({ type: User, nullable: true })
  user!: User | null;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @ApiProperty({ type: [Attendee] })
  attendees!: Attendee[];

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  eventTypeId!: number | null;

  @ValidateNested()
  @Type(() => EventType)
  @ApiProperty({ type: EventType, nullable: true })
  eventType!: EventType | null;
}

export class GetBookingOutput_2024_04_15 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: GetBookingData_2024_04_15,
  })
  @ValidateNested()
  @Type(() => GetBookingData_2024_04_15)
  data!: GetBookingData_2024_04_15;
}
