import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsTimeZone,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsEmail,
  ValidateNested,
  IsInt,
  Min,
  IsDate,
} from "class-validator";

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

  @IsArray()
  @IsString({ each: true })
  guests!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Location)
  location?: Location;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBookingInput {
  @IsString()
  @IsOptional()
  end?: string;

  @IsInt()
  @IsOptional()
  lengthInMinutes?: number;

  @IsString()
  start!: string;

  @IsInt()
  @Min(1)
  userId!: string;

  @IsNumber()
  eventTypeId!: number;

  @IsString()
  @IsOptional()
  eventTypeSlug?: string;

  @IsString()
  @IsOptional()
  rescheduleUid?: string;

  @IsString()
  @IsOptional()
  recurringEventId?: string;

  @IsOptional()
  @IsTimeZone()
  timeZone!: string;

  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user?: string[];

  @IsString()
  @IsOptional()
  language!: string;

  @IsString()
  @IsOptional()
  bookingUid?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  hasHashedBookingLink?: boolean;

  @IsString()
  @IsOptional()
  hashedLink!: string | null;

  @IsString()
  @IsOptional()
  seatReferenceUid?: string;

  @Type(() => Response)
  responses!: Response;

  @IsString()
  @IsOptional()
  orgSlug?: string;

  @IsString()
  @IsOptional()
  locationUrl?: string;
}

export class RescheduleBookingInput {
  @IsString()
  start!: string;

  @IsString()
  @IsOptional()
  reschedulingReason?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  userId?: string;
}
